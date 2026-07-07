-- ============================================================
-- PUSH TOKENS — device tokens for household-wide notifications
--
-- Run once in Supabase SQL Editor. The backend endpoints
-- (POST /api/push/register, push sends on status change) are
-- already deployed and no-op gracefully until this table exists.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  token       text        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform    text        NOT NULL DEFAULT 'android',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);

-- Only the backend (service role) touches this table; the mobile app never
-- reads or writes it directly.
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to push_tokens" ON push_tokens;
CREATE POLICY "Service role full access to push_tokens"
  ON push_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'push_tokens';
-- Expected: 1 row, rowsecurity = true
