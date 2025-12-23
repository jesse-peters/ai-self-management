#!/usr/bin/env node

/**
 * Test script for ProjectFlow MCP API
 * Tests OAuth authentication and tool calls
 * 
 * Usage:
 *   node scripts/test-mcp.js <supabase-jwt-token>
 * 
 * Or set environment variables:
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000
 *   SUPABASE_JWT_TOKEN=your-token-here
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_JWT = process.argv[2] || process.env.SUPABASE_JWT_TOKEN;

if (!SUPABASE_JWT) {
  console.error('Error: Supabase JWT token required');
  console.error('Usage: node scripts/test-mcp.js <supabase-jwt-token>');
  console.error('Or set SUPABASE_JWT_TOKEN environment variable');
  process.exit(1);
}

async function testMCP() {
  console.log('🧪 Testing ProjectFlow MCP API...\n');
  console.log(`API URL: ${API_URL}\n`);

  // Step 1: Test connection endpoint to get OAuth token
  console.log('1️⃣  Testing /api/mcp/connect (get OAuth token)...');
  try {
    const connectResponse = await fetch(`${API_URL}/api/mcp/connect`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_JWT}`,
      },
    });

    if (!connectResponse.ok) {
      const error = await connectResponse.text();
      throw new Error(`Connect failed: ${connectResponse.status} - ${error}`);
    }

    const config = await connectResponse.json();
    const oauthToken = config.mcpServers?.projectflow?.headers?.Authorization?.replace('Bearer ', '');
    
    if (!oauthToken) {
      throw new Error('No OAuth token in response');
    }

    console.log('✅ OAuth token generated successfully\n');
    console.log(`   Token: ${oauthToken.substring(0, 20)}...\n`);

    // Step 2: Test MCP endpoint with tools/list (no auth required)
    console.log('2️⃣  Testing /api/mcp tools/list (no auth)...');
    try {
      const listResponse = await fetch(`${API_URL}/api/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        }),
      });

      if (!listResponse.ok) {
        throw new Error(`tools/list failed: ${listResponse.status}`);
      }

      const listData = await listResponse.json();
      const tools = listData.result?.tools || [];
      console.log(`✅ Found ${tools.length} tools:`);
      tools.forEach(tool => {
        console.log(`   - ${tool.name}`);
      });
      console.log('');
    } catch (error) {
      console.error(`❌ tools/list failed:`, error.message);
      throw error;
    }

    // Step 3: Test MCP endpoint with tools/call (auth required)
    console.log('3️⃣  Testing /api/mcp tools/call with OAuth token...');
    try {
      const callResponse = await fetch(`${API_URL}/api/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oauthToken}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'list_projects',
            arguments: {},
          },
        }),
      });

      if (!callResponse.ok) {
        const errorData = await callResponse.json();
        throw new Error(`tools/call failed: ${callResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const callData = await callResponse.json();
      if (callData.error) {
        throw new Error(`Tool call error: ${JSON.stringify(callData.error)}`);
      }

      const result = callData.result?.content?.[0]?.text;
      const projects = result ? JSON.parse(result) : [];
      console.log(`✅ Tool call successful!`);
      console.log(`   Found ${projects.length} project(s)\n`);
    } catch (error) {
      console.error(`❌ tools/call failed:`, error.message);
      throw error;
    }

    // Step 4: Test creating a project
    console.log('4️⃣  Testing create_project tool...');
    try {
      const createResponse = await fetch(`${API_URL}/api/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oauthToken}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'create_project',
            arguments: {
              name: `MCP Test Project ${Date.now()}`,
              description: 'Created via MCP API test',
            },
          },
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`create_project failed: ${createResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const createData = await createResponse.json();
      if (createData.error) {
        throw new Error(`Tool call error: ${JSON.stringify(createData.error)}`);
      }

      const result = createData.result?.content?.[0]?.text;
      const project = result ? JSON.parse(result) : {};
      console.log(`✅ Project created successfully!`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Name: ${project.name}\n`);
    } catch (error) {
      console.error(`❌ create_project failed:`, error.message);
      throw error;
    }

    console.log('🎉 All MCP tests passed!');
    console.log('\n✅ OAuth authentication is working correctly');
    console.log('✅ Tool calls are functioning properly');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testMCP();

