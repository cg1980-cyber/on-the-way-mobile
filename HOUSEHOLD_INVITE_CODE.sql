-- ============================================================
-- HOUSEHOLD INVITE CODE — short human-friendly join code
-- Task #53, accept flow. Run after HOUSEHOLD_SCHEMA_MIGRATION.sql.
--
-- Adds a short code (e.g. "K7P4QM") to each invitation so an invited
-- person can type it in the app instead of a 64-char token.
-- ============================================================

ALTER TABLE household_invitations
  ADD COLUMN IF NOT EXISTS invite_code text;

-- Fast lookup when someone enters their code in the app
CREATE INDEX IF NOT EXISTS idx_invitations_code ON household_invitations (invite_code);

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = 'household_invitations' AND column_name = 'invite_code';
-- Expected: 1 row
