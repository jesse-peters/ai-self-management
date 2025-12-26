-- Update oauth_pending_requests table for request deduplication
-- Changes:
-- 1. Change unique constraint from (client_id, code_challenge) to just (client_id)
--    This ensures only ONE pending request per client at a time
-- 2. Add status column to track request state: 'pending' | 'authorized' | 'completed'

-- Drop the old unique constraint
ALTER TABLE oauth_pending_requests 
  DROP CONSTRAINT IF EXISTS oauth_pending_requests_client_id_code_challenge_key;

-- Add new unique constraint on client_id only
ALTER TABLE oauth_pending_requests 
  ADD CONSTRAINT oauth_pending_requests_client_id_key UNIQUE (client_id);

-- Add status column
ALTER TABLE oauth_pending_requests 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add check constraint for valid status values
ALTER TABLE oauth_pending_requests 
  ADD CONSTRAINT oauth_pending_requests_status_check 
  CHECK (status IN ('pending', 'authorized', 'completed'));

-- Create index on status for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_pending_status 
  ON oauth_pending_requests(status) 
  WHERE status = 'pending';

-- Update existing rows to have 'pending' status (if any exist)
UPDATE oauth_pending_requests 
SET status = CASE 
  WHEN authorization_code IS NOT NULL THEN 'authorized'
  ELSE 'pending'
END
WHERE status IS NULL OR status = '';

