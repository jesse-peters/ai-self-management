/**
 * Shared MCP Server Factory
 * Creates a configured MCP server instance that can be used with any transport
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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

/**
 * Auth context provider function
 * Returns userId from request context (from extra, env, or params)
 */
export type AuthContextProvider = (extra: RequestHandlerExtra) => string | null;

/**
 * Extracts userId from request context using multiple fallback strategies
 * @param authProvider Optional function to extract userId from request context
 * @param extra Request handler extra context
 * @returns userId or null if not found
 */
function extractUserIdFromContext(
    authProvider: AuthContextProvider | undefined,
    extra: RequestHandlerExtra
): string | null {
    // Try auth provider first
    if (authProvider) {
        const userId = authProvider(extra);
        if (userId) return userId;
    }

    // Fallback to extra context (for backward compatibility)
    if ((extra as any)?.userId) {
        return (extra as any).userId;
    }

    // Fallback to environment variables
    return process.env.MCP_USER_ID || process.env.USER_ID || null;
}

/**
 * Creates a configured MCP server instance
 * @param authProvider Optional function to extract userId from request context
 * @returns Configured Server instance ready to connect to a transport
 */
export function createMCPServer(authProvider?: AuthContextProvider): Server {
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
    server.setRequestHandler(CallToolRequestSchema, async (request, extra): Promise<CallToolResult> => {
        const toolName = request.params.name;
        const toolParams = (request.params.arguments as Record<string, unknown>) || {};

        try {
            // Get access token from request context (passed by auth middleware)
            // MCP clients must provide a Supabase-issued JWT token
            const accessToken = (extra as any)?.accessToken || process.env.MCP_ACCESS_TOKEN;

            if (!accessToken) {
                throw new Error('Access token not provided');
            }

            const result = await routeToolCall(toolName, toolParams, accessToken);
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
    server.setRequestHandler(ListResourcesRequestSchema, async (request, extra) => {
        try {
            const userId = extractUserIdFromContext(authProvider, extra);

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
    server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
        try {
            const uri = request.params.uri;
            const userId = extractUserIdFromContext(authProvider, extra);

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
    server.setRequestHandler(GetPromptRequestSchema, async (request, extra) => {
        try {
            const promptName = request.params.name;
            const args = (request.params.arguments as Record<string, unknown>) || {};
            const userId = extractUserIdFromContext(authProvider, extra);

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

    return server;
}

