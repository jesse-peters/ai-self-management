#!/usr/bin/env node
/**
 * Generate an OAuth token for testing MCP
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = 'test@test.com';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

async function main() {
  console.log(`Connecting to Supabase at ${SUPABASE_URL}...`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Get or create test user
  console.log(`\nLooking up user: ${TEST_EMAIL}`);
  const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();
  
  if (getUserError) {
    console.error('Error listing users:', getUserError);
    process.exit(1);
  }

  let user = users.users.find(u => u.email === TEST_EMAIL);
  
  if (!user) {
    console.log('Test user not found, creating...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true,
      user_metadata: { name: 'Test User' }
    });
    
    if (createError) {
      console.error('Error creating user:', createError);
      process.exit(1);
    }
    
    user = newUser.user;
    console.log(`Created user: ${user.id}`);
  } else {
    console.log(`Found user: ${user.id}`);
  }

  // Create OAuth token
  console.log('\nCreating OAuth token...');
  const clientId = 'mcp-client';
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data: tokenData, error: tokenError } = await supabase
    .from('oauth_tokens')
    .insert({
      user_id: user.id,
      client_id: clientId,
      access_token: `mcp_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
      expires_at: expiresAt.toISOString(),
      scope: 'projects:read projects:write tasks:read tasks:write',
    })
    .select()
    .single();

  if (tokenError) {
    console.error('Error creating OAuth token:', tokenError);
    process.exit(1);
  }

  console.log('\n✅ OAuth token created successfully!');
  console.log('\nToken:', tokenData.access_token);
  console.log('Expires:', expiresAt.toISOString());
  console.log('\nYou can now try creating a project via MCP!');
  console.log('\nOr test manually with:');
  console.log(`curl -H "Authorization: Bearer ${tokenData.access_token}" http://localhost:3000/api/mcp/test`);
}

main().catch(console.error);

