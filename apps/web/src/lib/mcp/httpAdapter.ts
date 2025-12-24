/**
 * HTTP Transport Adapter for MCP
 * Converts Next.js HTTP requests to MCP SDK format and back
 */

import { NextRequest, NextResponse } from 'next/server';
import { tools } from '@projectflow/mcp-server';
import { listResources, readResource } from '@projectflow/mcp-server';
import { prompts, getPrompt } from '@projectflow/mcp-server';
import { routeToolCall } from '@projectflow/mcp-server';
import { AuthContext } from './authMiddleware';

/**
 * JSON-RPC 2.0 Request format
 */
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number | null;
    method: string;
    params?: Record<string, unknown> | unknown[];
}

/**
 * JSON-RPC 2.0 Response format
 */
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

/**
 * Creates a JSON-RPC error response
 */
export function createJsonRpcError(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown
): JsonRpcResponse {
    return {
        jsonrpc: '2.0',
        id,
        error: {
            code,
            message,
            ...(data !== undefined && { data }),
        },
    };
}

/**
 * Creates a JSON-RPC success response
 */
export function createJsonRpcResponse(id: string | number | null, result: unknown): JsonRpcResponse {
    return {
        jsonrpc: '2.0',
        id,
        result,
    };
}

/**
 * Handles an incoming HTTP request and routes it through the MCP protocol
 * @param body Already-parsed request body (to avoid double-parsing)
 * @param authContext Authentication context extracted from token
 * @returns JSON-RPC 2.0 response
 */
export async function handleHttpRequest(
    body: unknown,
    authContext: AuthContext
): Promise<NextResponse> {
    try {
        // Validate JSON-RPC format
        const jsonRpcRequest = body as JsonRpcRequest;
        if (!jsonRpcRequest.jsonrpc || jsonRpcRequest.jsonrpc !== '2.0' || !jsonRpcRequest.method) {
            return NextResponse.json(
                createJsonRpcError(null, -32600, 'Invalid Request'),
                { status: 400 }
            );
        }

        const { method, params, id } = jsonRpcRequest;

        // Route the request through MCP protocol
        const result = await handleMCPRequest(method, params, id, authContext);

        return NextResponse.json(result);
    } catch (error) {
        console.error('HTTP request error:', error);
        return NextResponse.json(
            createJsonRpcError(null, -32603, 'Internal error'),
            { status: 500 }
        );
    }
}

/**
 * Routes MCP requests to the appropriate handler
 */
async function handleMCPRequest(
    method: string,
    params: unknown,
    id: string | number | null,
    authContext: AuthContext
): Promise<JsonRpcResponse> {
    try {
        switch (method) {
            case 'initialize': {
                return createJsonRpcResponse(id, {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {},
                        resources: {},
                        prompts: {},
                    },
                    serverInfo: {
                        name: 'projectflow',
                        version: '0.0.1',
                    },
                });
            }

            case 'ping': {
                return createJsonRpcResponse(id, {});
            }

            case 'tools/list': {
                try {
                    return createJsonRpcResponse(id, { tools });
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    return createJsonRpcError(id, -32603, msg);
                }
            }

            case 'tools/call': {
                if (!authContext.claims) {
                    return createJsonRpcError(id, -32001, 'Unauthorized', {
                        oauth_required: true,
                        error_type: 'authentication_required',
                    });
                }

                try {
                    const toolParams = params as Record<string, unknown> | undefined;
                    if (!toolParams || typeof toolParams !== 'object') {
                        return createJsonRpcError(id, -32602, 'Invalid params', {
                            expected: 'object with name and arguments',
                        });
                    }

                    const toolName = toolParams.name as string | undefined;
                    if (!toolName || typeof toolName !== 'string') {
                        return createJsonRpcError(id, -32602, 'Invalid params', {
                            expected: 'name (string)',
                        });
                    }

                    const toolArguments = (toolParams.arguments as Record<string, unknown>) || {};

                    // Inject userId into tool arguments if available
                    if (authContext.userId) {
                        toolArguments.userId = authContext.userId;
                    }

                    const result = await routeToolCall(toolName, toolArguments);
                    return createJsonRpcResponse(id, result);
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    return createJsonRpcError(id, -32603, msg);
                }
            }

            case 'resources/list': {
                try {
                    if (!authContext.userId) {
                        return createJsonRpcResponse(id, { resources: [] });
                    }
                    const resources = await listResources(authContext.userId);
                    return createJsonRpcResponse(id, { resources });
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    return createJsonRpcError(id, -32603, msg);
                }
            }

            case 'resources/read': {
                try {
                    if (!authContext.userId) {
                        return createJsonRpcError(id, -32001, 'Unauthorized', {
                            oauth_required: true,
                            error_type: 'authentication_required',
                        });
                    }

                    const resourceParams = params as Record<string, unknown> | undefined;
                    if (!resourceParams?.uri) {
                        return createJsonRpcError(id, -32602, 'Invalid params', {
                            expected: 'uri (string)',
                        });
                    }

                    const result = await readResource(authContext.userId, resourceParams.uri as string);
                    return createJsonRpcResponse(id, result);
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    return createJsonRpcError(id, -32603, msg);
                }
            }

            case 'prompts/list': {
                try {
                    return createJsonRpcResponse(id, { prompts });
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    return createJsonRpcError(id, -32603, msg);
                }
            }

            case 'prompts/get': {
                try {
                    if (!authContext.userId) {
                        return createJsonRpcError(id, -32001, 'Unauthorized', {
                            oauth_required: true,
                            error_type: 'authentication_required',
                        });
                    }

                    const promptParams = params as Record<string, unknown> | undefined;
                    if (!promptParams?.name) {
                        return createJsonRpcError(id, -32602, 'Invalid params', {
                            expected: 'name (string)',
                        });
                    }

                    const result = await getPrompt(
                        authContext.userId,
                        promptParams.name as string,
                        (promptParams.arguments as Record<string, unknown>) || {}
                    );
                    return createJsonRpcResponse(id, result);
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    return createJsonRpcError(id, -32603, msg);
                }
            }

            case 'notifications/initialized': {
                // Acknowledge notifications without error
                return createJsonRpcResponse(id, {});
            }

            default:
                return createJsonRpcError(id, -32601, 'Method not found', { method });
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return createJsonRpcError(id, -32603, msg);
    }
}
