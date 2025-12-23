-- Phase 1: Complete RLS and OAuth Support
-- Adds authorization codes table and auth helper functions for OAuth token validation

-- ============================================================================
-- Authorization Codes Table (currently stored in memory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  code_challenge TEXT,
  code_challenge_method TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_code ON oauth_authorization_codes(code);
CREATE INDEX IF NOT EXISTS idx_oauth_codes_user_id ON oauth_authorization_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires_at ON oauth_authorization_codes(expires_at);

-- ============================================================================
-- RLS for OAuth Authorization Codes
-- ============================================================================

ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Service role manages authorization codes" ON oauth_authorization_codes;

-- Only service role can manage authorization codes (via app layer)
-- No policies needed - service role bypasses RLS
-- This table is only accessed via service role key for OAuth flow

-- ============================================================================
-- Auth Helper Functions
-- ============================================================================

-- Helper function to get user ID from OAuth token
-- Returns NULL if token is invalid, expired, or revoked
CREATE OR REPLACE FUNCTION auth.user_id_from_oauth_token(token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM oauth_tokens
  WHERE access_token = token
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$;

-- Function to set user context from OAuth token
-- Called by MCP server to establish auth context for RLS
-- Raises exception if token is invalid
CREATE OR REPLACE FUNCTION auth.set_user_from_oauth(token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.user_id_from_oauth_token(token);
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired OAuth token';
  END IF;
  
  -- Set local config that RLS policies can check
  -- This config value is available to RLS policies via current_setting()
  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
END;
$$;

-- ============================================================================
-- Universal Auth Helper Function
-- ============================================================================

-- Helper function to get current authenticated user ID
-- Supports both Supabase session auth (auth.uid()) and OAuth token auth
-- Used by all RLS policies to determine current user
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  -- Try Supabase session first (web app with session cookies)
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;
  
  -- Fall back to OAuth context (MCP server with Bearer token)
  -- This is set by auth.set_user_from_oauth()
  IF current_setting('request.jwt.claim.sub', true) IS NOT NULL THEN
    RETURN current_setting('request.jwt.claim.sub', true)::UUID;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ============================================================================
-- Update Existing RLS Policies to Use Helper
-- ============================================================================

-- Projects table - update policies to use auth.current_user_id()
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.current_user_id() = user_id);

-- Tasks table - update policies to use auth.current_user_id()
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.current_user_id() = user_id);

-- Agent Sessions table - update policies to use auth.current_user_id()
DROP POLICY IF EXISTS "Users can view their own sessions" ON agent_sessions;
CREATE POLICY "Users can view their own sessions" ON agent_sessions
  FOR SELECT USING (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON agent_sessions;
CREATE POLICY "Users can insert their own sessions" ON agent_sessions
  FOR INSERT WITH CHECK (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON agent_sessions;
CREATE POLICY "Users can update their own sessions" ON agent_sessions
  FOR UPDATE USING (auth.current_user_id() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON agent_sessions;
CREATE POLICY "Users can delete their own sessions" ON agent_sessions
  FOR DELETE USING (auth.current_user_id() = user_id);

-- OAuth Tokens table - update policies to use auth.current_user_id()
DROP POLICY IF EXISTS "Users can view their own tokens" ON oauth_tokens;
CREATE POLICY "Users can view their own tokens" ON oauth_tokens
  FOR SELECT USING (auth.current_user_id() = user_id);

-- ============================================================================
-- Apply auth.current_user_id() to other tables from task-focused migration
-- ============================================================================

-- Check if events table exists and update its policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    DROP POLICY IF EXISTS "Users can view their own events" ON events;
    CREATE POLICY "Users can view their own events" ON events
      FOR SELECT USING (auth.current_user_id() = user_id);
  END IF;
END $$;

-- Check if artifacts table exists and update its policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artifacts') THEN
    DROP POLICY IF EXISTS "Users can view their own artifacts" ON artifacts;
    CREATE POLICY "Users can view their own artifacts" ON artifacts
      FOR SELECT USING (auth.current_user_id() = user_id);
      
    DROP POLICY IF EXISTS "Users can insert their own artifacts" ON artifacts;
    CREATE POLICY "Users can insert their own artifacts" ON artifacts
      FOR INSERT WITH CHECK (auth.current_user_id() = user_id);
      
    DROP POLICY IF EXISTS "Users can update their own artifacts" ON artifacts;
    CREATE POLICY "Users can update their own artifacts" ON artifacts
      FOR UPDATE USING (auth.current_user_id() = user_id);
  END IF;
END $$;

-- Check if checkpoints table exists and update its policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkpoints') THEN
    DROP POLICY IF EXISTS "Users can view their own checkpoints" ON checkpoints;
    CREATE POLICY "Users can view their own checkpoints" ON checkpoints
      FOR SELECT USING (auth.current_user_id() = user_id);
      
    DROP POLICY IF EXISTS "Users can insert their own checkpoints" ON checkpoints;
    CREATE POLICY "Users can insert their own checkpoints" ON checkpoints
      FOR INSERT WITH CHECK (auth.current_user_id() = user_id);
  END IF;
END $$;

-- Check if decisions table exists and update its policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decisions') THEN
    DROP POLICY IF EXISTS "Users can view their own decisions" ON decisions;
    CREATE POLICY "Users can view their own decisions" ON decisions
      FOR SELECT USING (auth.current_user_id() = user_id);
      
    DROP POLICY IF EXISTS "Users can insert their own decisions" ON decisions;
    CREATE POLICY "Users can insert their own decisions" ON decisions
      FOR INSERT WITH CHECK (auth.current_user_id() = user_id);
  END IF;
END $$;

-- ============================================================================
-- Migration Notes
-- ============================================================================

-- This migration enables proper RLS support for OAuth tokens by:
-- 1. Adding oauth_authorization_codes table for persistent code storage
-- 2. Adding auth.user_id_from_oauth_token() to validate OAuth access tokens
-- 3. Adding auth.set_user_from_oauth() to set user context from OAuth token
-- 4. Adding auth.current_user_id() helper used by all RLS policies
-- 5. Updating all RLS policies to use auth.current_user_id()
--
-- Result: Both session-based (web) and OAuth-based (MCP) requests are
-- automatically restricted to user's own data at the database level.

