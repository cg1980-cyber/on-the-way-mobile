-- ============================================================
-- TRACKING INBOX — stored copies of emails received at each
-- user's @onthewayapp.net tracking address (view + forward in-app).
--
-- Run once in Supabase SQL Editor. Backend endpoints are already
-- deployed and degrade gracefully until this table exists.
--
-- Notes:
--  * User-private (NOT household-shared) so raw emails can never
--    leak a gift purchase to another member.
--  * 30-day retention, pruned automatically by the backend.
--  * Deleting an account cascades away their stored emails.
-- ============================================================

CREATE TABLE IF NOT EXISTS received_emails (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_addr    text,
  subject      text,
  text_body    text,
  html_body    text,
  is_shipping  boolean     NOT NULL DEFAULT false,
  package_id   uuid        REFERENCES packages(id) ON DELETE SET NULL,
  received_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_received_emails_user_time
  ON received_emails (user_id, received_at DESC);

-- Only the backend touches this table; the app never queries it directly.
ALTER TABLE received_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON received_emails;
CREATE POLICY "service_role_all" ON received_emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'received_emails';
-- Expected: 1 row, rowsecurity = true
