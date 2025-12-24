-- Drop custom OAuth tables (no longer needed with Supabase Auth)
-- All OAuth operations are now handled by Supabase's built-in authentication

DROP TABLE IF EXISTS oauth_tokens CASCADE;
DROP TABLE IF EXISTS oauth_authorization_codes CASCADE;

-- Drop related indexes
DROP INDEX IF EXISTS idx_oauth_tokens_hash;
DROP INDEX IF EXISTS idx_oauth_tokens_user_id;
DROP INDEX IF EXISTS idx_oauth_tokens_access_token;
DROP INDEX IF EXISTS idx_oauth_tokens_refresh_token;
DROP INDEX IF EXISTS idx_oauth_tokens_expires_at;
DROP INDEX IF EXISTS idx_oauth_codes_code;
DROP INDEX IF EXISTS idx_oauth_codes_user_id;
DROP INDEX IF EXISTS idx_oauth_codes_expires_at;

