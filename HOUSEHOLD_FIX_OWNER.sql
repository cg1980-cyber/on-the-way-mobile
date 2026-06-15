-- ============================================================
-- FIX: household was seeded for the wrong account.
-- Cliff actually uses cgiles1998@yahoo.com in the app, not
-- hicliff1998@yahoo.com. This moves The Giles Household to the
-- correct account and assigns its packages.
-- Safe to run multiple times.
-- ============================================================

DO $$
DECLARE
  v_correct   uuid;   -- cgiles1998@yahoo.com (the account used in the app)
  v_wrong     uuid;   -- hicliff1998@yahoo.com (wrongly seeded earlier)
  v_household uuid;
  v_member    uuid;
  v_pkgs      int;
BEGIN
  SELECT id INTO v_correct FROM auth.users WHERE email = 'cgiles1998@yahoo.com' LIMIT 1;
  SELECT id INTO v_wrong   FROM auth.users WHERE email = 'hicliff1998@yahoo.com' LIMIT 1;

  IF v_correct IS NULL THEN
    RAISE EXCEPTION 'cgiles1998@yahoo.com not found in auth.users';
  END IF;

  -- Remove the household wrongly seeded for hicliff1998, but only if it
  -- owns no packages (so the FK on packages.household_id can't block it).
  IF v_wrong IS NOT NULL THEN
    DELETE FROM households h
    USING household_members hm
    WHERE hm.household_id = h.id
      AND hm.user_id = v_wrong
      AND hm.role = 'owner'
      AND NOT EXISTS (SELECT 1 FROM packages p WHERE p.household_id = h.id);
  END IF;

  -- If the correct account already has a household, leave it alone.
  IF EXISTS (SELECT 1 FROM household_members WHERE user_id = v_correct) THEN
    RAISE NOTICE 'cgiles1998 already has a household — nothing to do.';
    RETURN;
  END IF;

  INSERT INTO households (name)
  VALUES ('The Giles Household')
  RETURNING id INTO v_household;

  INSERT INTO household_members (household_id, user_id, role, display_name)
  VALUES (v_household, v_correct, 'owner', 'Cliff')
  RETURNING id INTO v_member;

  UPDATE packages
  SET household_id = v_household, recipient_member_id = v_member
  WHERE user_id = v_correct;
  GET DIAGNOSTICS v_pkgs = ROW_COUNT;

  RAISE NOTICE 'Created The Giles Household (%) for cgiles1998; assigned % packages.', v_household, v_pkgs;
END $$;

-- Verify: should show The Giles Household | Cliff | owner | <package count>
SELECT h.name, hm.display_name, hm.role, u.email, count(p.id) AS packages
FROM households h
JOIN household_members hm ON hm.household_id = h.id
JOIN auth.users u ON u.id = hm.user_id
LEFT JOIN packages p ON p.household_id = h.id
GROUP BY h.name, hm.display_name, hm.role, u.email;
