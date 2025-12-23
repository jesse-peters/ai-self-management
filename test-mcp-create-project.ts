#!/usr/bin/env tsx
/**
 * Quick test to create a project using MCP server handlers directly
 */

import { routeToolCall } from './apps/mcp-server/src/handlers';

const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function testCreateProject() {
  console.log('Creating project via MCP...\n');
  
  const result = await routeToolCall('pm.create_project', {
    userId: TEST_USER_ID,
    name: 'Test Project via MCP',
    description: 'Created using ProjectFlow MCP tools',
  });

  if (result.isError) {
    console.error('❌ Error:', result.content[0]?.text);
    process.exit(1);
  }

  const project = JSON.parse(result.content[0]?.text || '{}');
  console.log('✅ Project created successfully!');
  console.log(JSON.stringify(project, null, 2));
}

testCreateProject().catch(console.error);

