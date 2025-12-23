#!/usr/bin/env node

/**
 * ProjectFlow MCP Server
 * Exposes project/task management capabilities as MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
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
server.setRequestHandler(ListToolsRequestSchema, async (_request, _extra) => {
  return {
    tools: tools as Tool[],
  };
});

// Register CallToolRequest handler
server.setRequestHandler(CallToolRequestSchema, async (request, _extra): Promise<CallToolResult> => {
  const toolName = request.params.name;
  const toolParams = (request.params.arguments as Record<string, unknown>) || {};

  try {
    const result = await routeToolCall(toolName, toolParams);
    // Ensure content is always present
    return {
      content: result.content || [
        {
          type: 'text' as const,
          text: '',
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            code: 'INTERNAL_ERROR',
            message: errorMessage,
          }),
        },
      ],
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

