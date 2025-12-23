-- OAuth tokens table for MCP access
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  client_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(access_token)
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access_token ON oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_refresh_token ON oauth_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

-- Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Service role can manage tokens" ON oauth_tokens;

-- Users can only view their own tokens
CREATE POLICY "Users can view their own tokens" ON oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert/update tokens (via service role)
-- Note: In practice, we'll use service role key to bypass RLS for token operations
-- This policy ensures users can't directly manipulate tokens via RLS

