-- Create RLS policy for oauth_authorization_codes
-- This allows authenticated users to insert their own authorization codes

-- First, ensure RLS is enabled
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to insert authorization codes for themselves
CREATE POLICY "Users can insert their own authorization codes"
ON oauth_authorization_codes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to select their own authorization codes
CREATE POLICY "Users can view their own authorization codes"
ON oauth_authorization_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

