-- Create oauth_pending_requests table for tracking OAuth authorization requests
-- Used to handle concurrent requests in MCP OAuth flow

CREATE TABLE IF NOT EXISTS oauth_pending_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  redirect_uri TEXT NOT NULL,
  state TEXT,
  scope TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  authorization_code TEXT, -- Created after user authenticates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  
  -- Unique constraint: one pending request per client+challenge
  UNIQUE(client_id, code_challenge)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_oauth_pending_code_challenge ON oauth_pending_requests(code_challenge);
CREATE INDEX IF NOT EXISTS idx_oauth_pending_user_id ON oauth_pending_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oauth_pending_expires ON oauth_pending_requests(expires_at);

-- Enable RLS
ALTER TABLE oauth_pending_requests ENABLE ROW LEVEL SECURITY;

-- Service role can manage all pending requests
CREATE POLICY "Service role can manage all pending requests"
  ON oauth_pending_requests FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own pending requests
CREATE POLICY "Users can view their own pending requests"
  ON oauth_pending_requests FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);


