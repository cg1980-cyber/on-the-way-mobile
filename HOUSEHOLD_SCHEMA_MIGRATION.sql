-- ============================================================
-- HOUSEHOLD ACCOUNTS SCHEMA MIGRATION
-- Task #53 — Pillar 1
--
-- HOW TO USE:
-- 1. Go to Supabase Dashboard → SQL Editor → New query
-- 2. Paste this entire file
-- 3. Click Run
-- 4. Run the VERIFICATION block at the bottom to confirm
--
-- ============================================================


-- ============================================================
-- PART 1 — NEW TABLES
-- ============================================================

-- Households: one per family/home address
CREATE TABLE IF NOT EXISTS households (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Household members: one row per person in the household
-- Pending invites: user_id IS NULL, invite_email IS SET
-- Accepted members: user_id IS SET, invite_email IS NULL
CREATE TABLE IF NOT EXISTS household_members (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  role           text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  display_name   text        NOT NULL,
  invite_email   text,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

-- Invitations: one row per pending invite email sent
CREATE TABLE IF NOT EXISTS household_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by    uuid        NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  token         text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role          text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at   timestamptz
);


-- ============================================================
-- PART 2 — ALTER packages TABLE
-- ============================================================

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS household_id        uuid REFERENCES households(id),
  ADD COLUMN IF NOT EXISTS recipient_member_id uuid REFERENCES household_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hidden_from         uuid[] NOT NULL DEFAULT '{}';

-- Index for the common query pattern: "all non-hidden packages for this household"
CREATE INDEX IF NOT EXISTS idx_packages_household ON packages (household_id);


-- ============================================================
-- PART 3 — SEED CLIFF'S HOUSEHOLD
-- (runs as a transaction so it rolls back cleanly if anything fails)
-- ============================================================

DO $$
DECLARE
  v_user_id   uuid;
  v_household uuid;
  v_member    uuid;
BEGIN
  -- Look up Cliff's auth user id by email
  v_user_id := '6f428bdf-ee08-4bd2-b086-a90845415da2';

  -- Create the household
  INSERT INTO households (name)
  VALUES ('The Giles Household')
  RETURNING id INTO v_household;

  -- Add Cliff as owner
  INSERT INTO household_members (household_id, user_id, role, display_name)
  VALUES (v_household, v_user_id, 'owner', 'Cliff')
  RETURNING id INTO v_member;

  -- Assign all of Cliff's existing packages to the household
  UPDATE packages
  SET
    household_id        = v_household,
    recipient_member_id = v_member
  WHERE user_id = v_user_id;

  RAISE NOTICE 'Created household "The Giles Household" (id: %), Cliff member id: %', v_household, v_member;
  RAISE NOTICE 'Updated % packages.', (SELECT count(*) FROM packages WHERE household_id = v_household);
END $$;


-- ============================================================
-- PART 4 — RLS POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE households         ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;

-- Drop old package policies (we replace them below)
DROP POLICY IF EXISTS "Users can read own packages"   ON packages;
DROP POLICY IF EXISTS "Users can insert own packages" ON packages;
DROP POLICY IF EXISTS "Users can update own packages" ON packages;
DROP POLICY IF EXISTS "Users can delete own packages" ON packages;


-- ── households ───────────────────────────────────────────────

-- Any member can read their household row
CREATE POLICY "Members can read own household"
  ON households FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Owner can update household name
CREATE POLICY "Owner can update household"
  ON households FOR UPDATE
  USING (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Service role bypass (backend)
CREATE POLICY "Service role full access to households"
  ON households FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── household_members ─────────────────────────────────────────

-- Any member can read all members of their household
CREATE POLICY "Members can read household members"
  ON household_members FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Owner can add members (send invite = insert row with invite_email, null user_id)
CREATE POLICY "Owner can insert household members"
  ON household_members FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Owner can remove members; any member can remove themselves
CREATE POLICY "Owner or self can delete household member"
  ON household_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Any member can update their own display_name; owner can update any member's role
CREATE POLICY "Members can update own display name"
  ON household_members FOR UPDATE
  USING (user_id = auth.uid() OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Service role full access to household_members"
  ON household_members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── household_invitations ─────────────────────────────────────

-- Owner can read/create invitations for their household
CREATE POLICY "Owner can manage invitations"
  ON household_invitations FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Anyone can read an invitation by token (needed for the accept flow — backend handles this via service role)
CREATE POLICY "Service role full access to invitations"
  ON household_invitations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── packages (replace old single-user policies) ───────────────

-- Members can read packages in their household (except ones they're hidden from)
CREATE POLICY "Household members can read packages"
  ON packages FOR SELECT
  USING (
    -- Own package (no household yet, backward compat)
    (household_id IS NULL AND auth.uid() = user_id)
    OR
    -- Household package, not hidden from this viewer
    (
      household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
      )
      AND NOT (
        (SELECT id FROM household_members WHERE user_id = auth.uid() AND household_id = packages.household_id LIMIT 1)
        = ANY(hidden_from)
      )
    )
  );

-- Any household member can add a package to the household
CREATE POLICY "Household members can insert packages"
  ON packages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      household_id IS NULL
      OR household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
      )
    )
  );

-- Package adder OR household owner can update
CREATE POLICY "Package owner or household owner can update"
  ON packages FOR UPDATE
  USING (
    auth.uid() = user_id
    OR household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Package adder OR household owner can delete
CREATE POLICY "Package owner or household owner can delete"
  ON packages FOR DELETE
  USING (
    auth.uid() = user_id
    OR household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Backend service role bypass (unchanged)
CREATE POLICY "Backend service role can modify packages"
  ON packages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- VERIFICATION — run after the script completes
-- ============================================================

-- 1. Tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('households', 'household_members', 'household_invitations')
ORDER BY table_name;
-- Expected: 3 rows

-- 2. Cliff's household seeded
SELECT h.name, hm.display_name, hm.role, count(p.id) AS packages
FROM households h
JOIN household_members hm ON hm.household_id = h.id
LEFT JOIN packages p ON p.household_id = h.id
GROUP BY h.name, hm.display_name, hm.role;
-- Expected: "The Giles Household | Cliff | owner | 9" (or however many packages)

-- 3. RLS enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('packages', 'households', 'household_members', 'household_invitations')
ORDER BY tablename;
-- Expected: rowsecurity = true for all 4

-- 4. Policy count per table
SELECT tablename, count(*) AS policy_count
FROM pg_policies
WHERE tablename IN ('packages', 'households', 'household_members', 'household_invitations')
GROUP BY tablename ORDER BY tablename;
-- Expected: households=3, household_invitations=2, household_members=5, packages=5
