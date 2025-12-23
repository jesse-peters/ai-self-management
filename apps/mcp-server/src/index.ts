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
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { tools } from './tools';
import { routeToolCall } from './handlers';
import { listResources, readResource } from './resources';
import { prompts, getPrompt } from './prompts';
import { resolveUserId } from './auth';

// Initialize MCP Server
const server = new Server(
  {
    name: 'projectflow',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
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

// Register ListResourcesRequest handler
server.setRequestHandler(ListResourcesRequestSchema, async (request, _extra) => {
  try {
    // Extract userId from extra context if available, or use default
    const userId = (request as any).userId || process.env.USER_ID || '';
    if (!userId) {
      // Return empty resources if no user context
      return { resources: [] };
    }
    const resources = await listResources(userId);
    return { resources };
  } catch (error) {
    console.error('Error listing resources:', error);
    return { resources: [] };
  }
});

// Register ReadResourceRequest handler
server.setRequestHandler(ReadResourceRequestSchema, async (request, _extra) => {
  try {
    const uri = request.params.uri;
    // Extract userId from extra context if available, or use default
    const userId = (request as any).userId || process.env.USER_ID || '';
    if (!userId) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'User authentication required' }),
          },
        ],
      };
    }
    return await readResource(userId, uri);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: errorMessage }),
        },
      ],
    };
  }
});

// Register ListPromptsRequest handler
server.setRequestHandler(ListPromptsRequestSchema, async (_request, _extra) => {
  return {
    prompts: prompts,
  };
});

// Register GetPromptRequest handler
server.setRequestHandler(GetPromptRequestSchema, async (request, _extra) => {
  try {
    const promptName = request.params.name;
    const args = (request.params.arguments as Record<string, unknown>) || {};
    
    // Extract userId from extra context if available, or use default
    const userId = (request as any).userId || process.env.USER_ID || '';
    if (!userId) {
      throw new Error('User authentication required for prompts');
    }
    
    return await getPrompt(userId, promptName, args);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
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

