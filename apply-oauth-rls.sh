#!/bin/bash

# Apply RLS policy for oauth_authorization_codes table
# This script manually applies the SQL migration to enable OAuth authorization

echo "Applying RLS policy for oauth_authorization_codes..."

# Get the Supabase database URL from environment
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set."
    echo "Please set it to your Supabase database connection string."
    echo "Example: export DATABASE_URL='postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres'"
    exit 1
fi

# Apply the migration
psql "$DATABASE_URL" <<SQL
-- Create RLS policy for oauth_authorization_codes
-- This allows authenticated users to insert their own authorization codes

-- First, ensure RLS is enabled
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own authorization codes" ON oauth_authorization_codes;
DROP POLICY IF EXISTS "Users can view their own authorization codes" ON oauth_authorization_codes;

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

SELECT 'RLS policy applied successfully!' as status;
SQL

if [ $? -eq 0 ]; then
    echo "✅ RLS policy applied successfully!"
    echo "You can now try the OAuth flow again."
else
    echo "❌ Failed to apply RLS policy. Check the error message above."
    exit 1
fi

