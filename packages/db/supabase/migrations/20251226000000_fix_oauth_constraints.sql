-- Fix oauth_pending_requests constraints
-- Remove any incorrect unique constraint on client_id alone
-- Ensure only UNIQUE(client_id, code_challenge) exists

-- Drop the incorrect constraint if it exists
ALTER TABLE oauth_pending_requests 
DROP CONSTRAINT IF EXISTS oauth_pending_requests_client_id_key;

-- Ensure the correct composite unique constraint exists
-- (This should already exist from the original migration, but verify)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'oauth_pending_requests'::regclass 
        AND conname = 'oauth_pending_requests_client_id_code_challenge_key'
    ) THEN
        ALTER TABLE oauth_pending_requests 
        ADD CONSTRAINT oauth_pending_requests_client_id_code_challenge_key 
        UNIQUE (client_id, code_challenge);
    END IF;
END $$;

