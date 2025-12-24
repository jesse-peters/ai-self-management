-- Disable RLS on oauth_authorization_codes table
-- This table is only accessed via service role key for OAuth flow
-- RLS is not needed since service role bypasses RLS anyway, and having RLS enabled
-- with no policies causes PostgREST to attempt JWT parsing which fails

ALTER TABLE oauth_authorization_codes DISABLE ROW LEVEL SECURITY;

