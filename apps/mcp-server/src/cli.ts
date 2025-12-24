#!/usr/bin/env node

/**
 * CLI Entry Point for ProjectFlow MCP Server
 * Use this for stdio transport (local development)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { createMCPServer, type AuthContextProvider } from './serverFactory';

// Create auth provider that resolves userId from environment or params
const createAuthProvider = (): AuthContextProvider => {
  return (_extra: RequestHandlerExtra) => {
    // Try to get userId from environment
    return process.env.MCP_USER_ID || null;
  };
};

// Set up stdio transport and connect
async function main() {
  // Create auth provider
  const authProvider = createAuthProvider();

  // Create configured MCP server
  const server = createMCPServer(authProvider);

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ProjectFlow MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



