-- JWT-based OAuth 2.1 Migration
-- Simplifies auth by using JWTs signed with Supabase's secret
-- This makes auth.uid() work natively without custom RPC functions

-- Add hash column for JWT access tokens if not exists
ALTER TABLE oauth_tokens 
  ADD COLUMN IF NOT EXISTS access_token_hash TEXT;

-- Create index for faster JWT lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_hash ON oauth_tokens(access_token_hash);

-- Update RLS policies to use native auth.uid()
-- Projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;  
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Agent Sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON agent_sessions;
CREATE POLICY "Users can view their own sessions" ON agent_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON agent_sessions;
CREATE POLICY "Users can insert their own sessions" ON agent_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON agent_sessions;
CREATE POLICY "Users can update their own sessions" ON agent_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Events
DROP POLICY IF EXISTS "Users can view their own events" ON events;
CREATE POLICY "Users can view their own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own events" ON events;
CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Artifacts
DROP POLICY IF EXISTS "Users can view their own artifacts" ON artifacts;
CREATE POLICY "Users can view their own artifacts" ON artifacts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own artifacts" ON artifacts;
CREATE POLICY "Users can insert their own artifacts" ON artifacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own artifacts" ON artifacts;
CREATE POLICY "Users can update their own artifacts" ON artifacts
  FOR UPDATE USING (auth.uid() = user_id);

-- Checkpoints
DROP POLICY IF EXISTS "Users can view their own checkpoints" ON checkpoints;
CREATE POLICY "Users can view their own checkpoints" ON checkpoints
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own checkpoints" ON checkpoints;
CREATE POLICY "Users can insert their own checkpoints" ON checkpoints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own checkpoints" ON checkpoints;
CREATE POLICY "Users can update their own checkpoints" ON checkpoints
  FOR UPDATE USING (auth.uid() = user_id);

-- Decisions
DROP POLICY IF EXISTS "Users can view their own decisions" ON decisions;
CREATE POLICY "Users can view their own decisions" ON decisions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own decisions" ON decisions;
CREATE POLICY "Users can insert their own decisions" ON decisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own decisions" ON decisions;
CREATE POLICY "Users can update their own decisions" ON decisions
  FOR UPDATE USING (auth.uid() = user_id);

-- OAuth Tokens
DROP POLICY IF EXISTS "Users can view their own tokens" ON oauth_tokens;
CREATE POLICY "Users can view their own tokens" ON oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tokens" ON oauth_tokens;
CREATE POLICY "Users can insert their own tokens" ON oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tokens" ON oauth_tokens;
CREATE POLICY "Users can update their own tokens" ON oauth_tokens
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tokens" ON oauth_tokens;
CREATE POLICY "Users can delete their own tokens" ON oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Authorization Codes
DROP POLICY IF EXISTS "Users can view their own codes" ON authorization_codes;
CREATE POLICY "Users can view their own codes" ON authorization_codes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own codes" ON authorization_codes;
CREATE POLICY "Users can insert their own codes" ON authorization_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own codes" ON authorization_codes;
CREATE POLICY "Users can update their own codes" ON authorization_codes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own codes" ON authorization_codes;
CREATE POLICY "Users can delete their own codes" ON authorization_codes
  FOR DELETE USING (auth.uid() = user_id);

-- Drop old custom auth functions (no longer needed with JWT approach)
DROP FUNCTION IF EXISTS auth.set_user_from_oauth(TEXT);
DROP FUNCTION IF EXISTS auth.user_id_from_oauth_token(TEXT);
DROP FUNCTION IF EXISTS auth.current_user_id();
DROP FUNCTION IF EXISTS public.set_user_from_oauth(TEXT);



