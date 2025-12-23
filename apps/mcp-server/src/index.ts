#!/usr/bin/env node

/**
 * ProjectFlow MCP Server
 * Exposes project/task management capabilities as MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequest,
  ListToolsRequest,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools';
import { routeToolCall } from './handlers';

// Initialize MCP Server
const server = new Server(
  {
    name: 'projectflow',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register ListToolsRequest handler
server.setRequestHandler(ListToolsRequest, async () => {
  return {
    tools: tools as Tool[],
  };
});

// Register CallToolRequest handler
server.setRequestHandler(CallToolRequest, async (request) => {
  const toolName = request.params.name;
  const toolParams = (request.params.arguments as Record<string, unknown>) || {};

  try {
    const result = await routeToolCall(toolName, toolParams);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            code: 'INTERNAL_ERROR',
            message: errorMessage,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Set up stdio transport and connect
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ProjectFlow MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

