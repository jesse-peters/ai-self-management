#!/usr/bin/env tsx
/**
 * Test script to create a project via MCP
 * 
 * This script:
 * 1. Generates a test JWT token (development only)
 * 2. Uses the MCP handlers to create a project
 * 
 * Usage:
 *   tsx test-create-project-mcp.ts
 * 
 * Environment variables needed:
 *   SUPABASE_JWT_SECRET - JWT secret from Supabase
 *   NEXT_PUBLIC_APP_URL - App URL (defaults to http://localhost:3000)
 */

import * as jose from 'jose';
import { routeToolCall } from './apps/mcp-server/src/handlers';

const DEV_TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function generateTestToken(): Promise<string> {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!jwtSecret) {
    throw new Error(
      'SUPABASE_JWT_SECRET environment variable is required.\n' +
      'Get it from Supabase Dashboard → Settings → API → JWT Keys → Legacy JWT secret'
    );
  }

  const secret = new TextEncoder().encode(jwtSecret);
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600; // 1 hour

  const token = await new jose.SignJWT({
    sub: DEV_TEST_USER_ID,
    email: 'test@projectflow.local',
    role: 'authenticated',
    aud: `${appUrl}/api/mcp`,
    iat: now,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(now + expiresIn)
    .sign(secret);

  return token;
}

async function testCreateProject() {
  console.log('🧪 Testing ProjectFlow MCP - Create Project\n');
  console.log('=' .repeat(50));
  console.log('');

  try {
    // Step 1: Generate test token
    console.log('1️⃣  Generating test JWT token...');
    const token = await generateTestToken();
    console.log(`✅ Token generated (${token.substring(0, 20)}...)\n`);

    // Step 2: Create a project
    console.log('2️⃣  Creating project via MCP...');
    const projectName = `MCP Test Project ${new Date().toISOString()}`;
    const result = await routeToolCall(
      'pm.create_project',
      {
        name: projectName,
        description: 'Created via MCP test script',
      },
      token
    );

    if (result.isError) {
      const error = JSON.parse(result.content[0]?.text || '{}');
      console.error('❌ Failed to create project:');
      console.error(JSON.stringify(error, null, 2));
      process.exit(1);
    }

    const project = JSON.parse(result.content[0]?.text || '{}');
    console.log('✅ Project created successfully!');
    console.log('');
    console.log('Project details:');
    console.log(JSON.stringify(project, null, 2));
    console.log('');

    // Step 3: List projects to verify
    console.log('3️⃣  Listing projects to verify...');
    const listResult = await routeToolCall('pm.list_projects', {}, token);
    const projects = JSON.parse(listResult.content[0]?.text || '[]');
    console.log(`✅ Found ${projects.length} project(s)`);
    if (projects.length > 0) {
      console.log('Recent projects:');
      projects.slice(0, 3).forEach((p: any) => {
        console.log(`  - ${p.name} (${p.id})`);
      });
    }
    console.log('');

    console.log('=' .repeat(50));
    console.log('🎉 Test completed successfully!');
    console.log('');
    console.log(`Project ID: ${project.id}`);
    console.log(`Project Name: ${project.name}`);
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testCreateProject();

