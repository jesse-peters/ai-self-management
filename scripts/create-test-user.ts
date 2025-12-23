/**
 * Script to create a test user for local development
 * Run with: tsx scripts/create-test-user.ts
 */

import { createClient } from '@supabase/supabase-js';

const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function createTestUser() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Check if user already exists
    const { data: existingUser, error: getUserError } =
      await supabase.auth.admin.getUserById(TEST_USER_ID);

    if (existingUser?.user && !getUserError) {
      console.log('✓ Test user already exists:', TEST_USER_ID);
      console.log('  Email:', existingUser.user.email);
      return;
    }

    // Create test user
    const { data, error } = await supabase.auth.admin.createUser({
      id: TEST_USER_ID,
      email: 'test@projectflow.local',
      email_confirm: true,
      user_metadata: { name: 'Test User' },
    });

    if (error) {
      console.error('❌ Error creating user:', error.message);
      process.exit(1);
    }

    if (data?.user) {
      console.log('✓ Test user created successfully!');
      console.log('  ID:', data.user.id);
      console.log('  Email:', data.user.email);
    } else {
      console.error('❌ Failed to create user: No user data returned');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

createTestUser();

