#!/usr/bin/env node

/**
 * CLI Entry Point for ProjectFlow MCP Server
 * Use this for stdio transport (local development)
 */

// Initialize Sentry as early as possible, before other imports
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event, hint) {
    // Filter out expected errors
    if (event.exception) {
      const error = hint.originalException;
      // Don't capture validation errors as errors (they're expected)
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: string }).code;
        if (code === 'INVALID_PARAMS' || code === 'NOT_FOUND') {
          return null; // Don't send to Sentry
        }
      }
    }
    return event;
  },
  ignoreErrors: [
    'ValidationError',
  ],
});

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, type AuthContextProvider } from './serverFactory';

// Create auth provider that resolves userId from environment or params
const createAuthProvider = (): AuthContextProvider => {
  return (_extra: any) => {
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
  // Capture fatal errors to Sentry before exiting
  Sentry.captureException(error, {
    level: 'fatal',
    tags: {
      component: 'mcp-server-cli',
    },
  });
  // Flush Sentry events before exiting
  Sentry.flush(2000).then(() => {
    process.exit(1);
  });
});



