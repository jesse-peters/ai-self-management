import { NextRequest, NextResponse } from 'next/server';
import {
    createProject,
    listProjects,
    createTask,
    listTasks,
    updateTask,
    getProjectContext,
    saveSessionContext,
    ProjectFlowError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
} from '@projectflow/core';
import { validateOAuthToken } from '@/lib/oauth';
// MCP Tool type definition (matching @modelcontextprotocol/sdk)
interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}

// MCP Tool definitions (matching apps/mcp-server/src/tools.ts)
const tools: MCPTool[] = [
    {
        name: 'create_project',
        description: 'Creates a new project for the user',
        inputSchema: {
            type: 'object' as const,
            properties: {
                name: { type: 'string', description: 'Project name' },
                description: { type: 'string', description: 'Optional project description' },
                userId: { type: 'string', description: 'User ID (optional if set in env)' },
            },
            required: ['name'],
        },
    },
    {
        name: 'list_projects',
        description: 'Lists all projects for the user',
        inputSchema: {
            type: 'object' as const,
            properties: {
                userId: { type: 'string', description: 'User ID (optional if set in env)' },
            },
        },
    },
    {
        name: 'create_task',
        description: 'Creates a new task in a project',
        inputSchema: {
            type: 'object' as const,
            properties: {
                projectId: { type: 'string', description: 'Project ID' },
                title: { type: 'string', description: 'Task title' },
                description: { type: 'string', description: 'Optional task description' },
                status: {
                    type: 'string',
                    enum: ['todo', 'in_progress', 'done'],
                    description: 'Task status',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Task priority',
                },
                userId: { type: 'string', description: 'User ID (optional if set in env)' },
            },
            required: ['projectId', 'title'],
        },
    },
    {
        name: 'list_tasks',
        description: 'Lists tasks in a project with optional filters',
        inputSchema: {
            type: 'object' as const,
            properties: {
                projectId: { type: 'string', description: 'Project ID' },
                status: {
                    type: 'string',
                    enum: ['todo', 'in_progress', 'done'],
                    description: 'Filter by status',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Filter by priority',
                },
                userId: { type: 'string', description: 'User ID (optional if set in env)' },
            },
            required: ['projectId'],
        },
    },
    {
        name: 'update_task',
        description: 'Updates an existing task',
        inputSchema: {
            type: 'object' as const,
            properties: {
                taskId: { type: 'string', description: 'Task ID' },
                title: { type: 'string', description: 'New task title' },
                description: { type: 'string', description: 'New task description' },
                status: {
                    type: 'string',
                    enum: ['todo', 'in_progress', 'done'],
                    description: 'New task status',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'New task priority',
                },
                userId: { type: 'string', description: 'User ID (optional if set in env)' },
            },
            required: ['taskId'],
        },
    },
    {
        name: 'get_project_context',
        description: 'Gets complete project context including project, tasks, and latest session',
        inputSchema: {
            type: 'object' as const,
            properties: {
                projectId: { type: 'string', description: 'Project ID' },
                userId: { type: 'string', description: 'User ID (optional if set in env)' },
            },
            required: ['projectId'],
        },
    },
    {
        name: 'save_session_context',
        description: 'Saves an agent session snapshot for a project',
        inputSchema: {
            type: 'object' as const,
            properties: {
                projectId: { type: 'string', description: 'Project ID' },
                snapshot: { type: 'object', description: 'Session state snapshot (JSON object)' },
                summary: { type: 'string', description: 'Optional session summary' },
                userId: { type: 'string', description: 'User ID (optional if set in env)' },
            },
            required: ['projectId', 'snapshot'],
        },
    },
];

// JSON-RPC 2.0 interfaces
interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number | null;
    method: string;
    params?: Record<string, unknown> | unknown[];
}

interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

// Legacy REST format interfaces (for backward compatibility)
interface MCPRequest {
    name: string;
    parameters: Record<string, unknown>;
}

async function verifyAuthToken(token: string): Promise<string> {
    return await validateOAuthToken(token);
}

async function handleToolCall(
    userId: string,
    toolName: string,
    parameters: Record<string, unknown>
): Promise<unknown> {
    switch (toolName) {
        case 'create_project':
            return createProject(userId, {
                name: parameters.name as string,
                description: parameters.description as string | undefined,
            });

        case 'list_projects':
            return listProjects(userId);

        case 'create_task':
            return createTask(userId, parameters.projectId as string, {
                title: parameters.title as string,
                description: parameters.description as string | undefined,
                status: parameters.status as 'todo' | 'in_progress' | 'done' | undefined,
                priority: parameters.priority as 'low' | 'medium' | 'high' | undefined,
            });

        case 'list_tasks':
            return listTasks(userId, parameters.projectId as string, {
                status: parameters.status as 'todo' | 'in_progress' | 'done' | undefined,
                priority: parameters.priority as 'low' | 'medium' | 'high' | undefined,
            });

        case 'update_task':
            return updateTask(userId, parameters.taskId as string, {
                title: parameters.title as string | undefined,
                description: parameters.description as string | undefined,
                status: parameters.status as 'todo' | 'in_progress' | 'done' | undefined,
                priority: parameters.priority as 'low' | 'medium' | 'high' | undefined,
            });

        case 'get_project_context':
            return getProjectContext(userId, parameters.projectId as string);

        case 'save_session_context':
            return saveSessionContext(
                userId,
                parameters.projectId as string,
                parameters.snapshot as Record<string, unknown>,
                parameters.summary as string | undefined
            );

        default:
            throw new ValidationError(`Unknown tool: ${toolName}`, 'name');
    }
}

function createJsonRpcError(
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

function createJsonRpcResponse(id: string | number | null, result: unknown): JsonRpcResponse {
    return {
        jsonrpc: '2.0',
        id,
        result,
    };
}

async function handleJsonRpcRequest(
    request: JsonRpcRequest,
    userId: string | null
): Promise<JsonRpcResponse> {
    const { method, params, id } = request;

    // Handle tools/list - no authentication required
    if (method === 'tools/list') {
        return createJsonRpcResponse(id, {
            tools,
        });
    }

    // Handle initialize - no authentication required
    if (method === 'initialize') {
        return createJsonRpcResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {},
            },
            serverInfo: {
                name: 'projectflow',
                version: '0.1.0',
            },
        });
    }

    // Handle ping - no authentication required
    if (method === 'ping') {
        return createJsonRpcResponse(id, {});
    }

    // Handle tools/call - authentication required
    if (method === 'tools/call') {
        if (!userId) {
            return createJsonRpcError(id, -32001, 'OAuth 2.1 authentication required. Please complete the OAuth authorization flow to obtain an access token.', {
                oauth_required: true,
                error_type: 'authentication_required',
            });
        }

        const paramsObj = params as Record<string, unknown> | undefined;
        if (!paramsObj || typeof paramsObj !== 'object') {
            return createJsonRpcError(id, -32602, 'Invalid params', {
                expected: 'object with name and arguments',
            });
        }

        const toolName = paramsObj.name as string | undefined;
        const toolArguments = (paramsObj.arguments as Record<string, unknown>) || {};

        if (!toolName || typeof toolName !== 'string') {
            return createJsonRpcError(id, -32602, 'Invalid params', {
                expected: 'name (string)',
            });
        }

        try {
            const result = await handleToolCall(userId, toolName, toolArguments);
            
            // Format as MCP CallToolResult
            return createJsonRpcResponse(id, {
                content: [
                    {
                        type: 'text',
                        text: typeof result === 'string' ? result : JSON.stringify(result),
                    },
                ],
            });
        } catch (error) {
            let errorCode = -32603; // Internal error
            let errorMessage = 'Internal error';
            const errorData: unknown = undefined;

            if (error instanceof ValidationError) {
                errorCode = -32602; // Invalid params
                errorMessage = error.message;
            } else if (error instanceof NotFoundError) {
                errorCode = -32602;
                errorMessage = error.message;
            } else if (error instanceof UnauthorizedError) {
                errorCode = -32001; // Unauthorized
                errorMessage = error.message;
            } else if (error instanceof ProjectFlowError) {
                errorCode = -32602;
                errorMessage = error.message;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            return createJsonRpcError(id, errorCode, errorMessage, errorData);
        }
    }

    // Unknown method
    return createJsonRpcError(id, -32601, 'Method not found', {
        method,
    });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const url = request.nextUrl.toString();
    console.log(`[MCP] POST ${url}`);
    
    try {
        // Extract OAuth token from Authorization header (optional for some methods)
        const authHeader = request.headers.get('Authorization');
        let userId: string | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            console.log(`[MCP] Auth token provided: ${token.substring(0, 20)}...`);
            try {
                userId = await verifyAuthToken(token);
                console.log(`[MCP] Token validated, userId: ${userId}`);
            } catch (error) {
                // Token invalid, but we'll handle auth per-method
                console.log(`[MCP] Token validation failed:`, error instanceof Error ? error.message : 'Unknown error');
                userId = null;
            }
        } else {
            console.log(`[MCP] No Authorization header provided`);
        }

        // Parse request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            // Try to detect if it's legacy REST format
            return NextResponse.json(
                { success: false, error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        // Check if it's JSON-RPC format
        const jsonRpcRequest = body as JsonRpcRequest;
        if (jsonRpcRequest.jsonrpc === '2.0' && jsonRpcRequest.method) {
            console.log(`[MCP] JSON-RPC request: method=${jsonRpcRequest.method}, id=${jsonRpcRequest.id}, hasAuth=${userId !== null}`);
            const response = await handleJsonRpcRequest(jsonRpcRequest, userId);
            const duration = Date.now() - startTime;
            console.log(`[MCP] JSON-RPC response (${duration}ms):`, {
                method: jsonRpcRequest.method,
                hasError: !!response.error,
                errorCode: response.error?.code,
            });
            
            // If authentication is required but not provided, add OAuth challenge headers
            if (response.error?.code === -32001 && (response.error?.data as { oauth_required?: boolean })?.oauth_required) {
                const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
                const enhancedError = {
                    ...response.error,
                    data: {
                        ...(response.error.data as object || {}),
                        oauth_required: true,
                        oauth_metadata: {
                            authorization_endpoint: `${apiUrl}/api/oauth/authorize`,
                            token_endpoint: `${apiUrl}/api/oauth/token`,
                            revocation_endpoint: `${apiUrl}/api/oauth/revoke`,
                            registration_endpoint: `${apiUrl}/api/oauth/register`,
                            well_known: {
                                authorization_server: `${apiUrl}/.well-known/oauth-authorization-server`,
                                protected_resource: `${apiUrl}/.well-known/oauth-protected-resource`,
                            },
                            scopes_supported: [
                                'projects:read',
                                'projects:write',
                                'tasks:read',
                                'tasks:write',
                                'sessions:read',
                                'sessions:write',
                            ],
                            grant_types_supported: ['authorization_code', 'refresh_token'],
                            response_types_supported: ['code'],
                        },
                        message: 'OAuth 2.1 authentication required. Visit the authorization_endpoint to begin the OAuth flow.',
                    },
                };
                return NextResponse.json(
                    {
                        ...response,
                        error: enhancedError,
                    },
                    {
                        status: 401,
                        headers: {
                            'WWW-Authenticate': `Bearer realm="${apiUrl}/api/mcp", authorization_uri="${apiUrl}/api/oauth/authorize", token_uri="${apiUrl}/api/oauth/token", scope="projects:read projects:write tasks:read tasks:write sessions:read sessions:write"`,
                            'X-OAuth-Authorization-Endpoint': `${apiUrl}/api/oauth/authorize`,
                            'X-OAuth-Token-Endpoint': `${apiUrl}/api/oauth/token`,
                        },
                    }
                );
            }

            return NextResponse.json(response);
        }

        // Legacy REST format support (backward compatibility)
        const legacyRequest = body as MCPRequest;
        if (legacyRequest.name && legacyRequest.parameters) {
            console.log(`[MCP] Legacy REST request: name=${legacyRequest.name}, hasAuth=${userId !== null}`);
            if (!userId) {
                const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
                return NextResponse.json(
                    {
                        success: false,
                        error: 'OAuth 2.1 authentication required',
                        error_description: 'Please complete the OAuth authorization flow to obtain an access token',
                        oauth_url: `${apiUrl}/api/oauth/authorize`,
                        oauth_metadata: {
                            authorization_endpoint: `${apiUrl}/api/oauth/authorize`,
                            token_endpoint: `${apiUrl}/api/oauth/token`,
                            revocation_endpoint: `${apiUrl}/api/oauth/revoke`,
                            registration_endpoint: `${apiUrl}/api/oauth/register`,
                            well_known: {
                                authorization_server: `${apiUrl}/.well-known/oauth-authorization-server`,
                                protected_resource: `${apiUrl}/.well-known/oauth-protected-resource`,
                            },
                        },
                    },
                    {
                        status: 401,
                        headers: {
                            'WWW-Authenticate': `Bearer realm="${apiUrl}/api/mcp", authorization_uri="${apiUrl}/api/oauth/authorize", token_uri="${apiUrl}/api/oauth/token", scope="projects:read projects:write tasks:read tasks:write sessions:read sessions:write"`,
                            'X-OAuth-Authorization-Endpoint': `${apiUrl}/api/oauth/authorize`,
                            'X-OAuth-Token-Endpoint': `${apiUrl}/api/oauth/token`,
                        },
                    }
                );
            }

            try {
                const result = await handleToolCall(userId, legacyRequest.name, legacyRequest.parameters);
                return NextResponse.json(
                    { success: true, data: result },
                    { status: 200 }
                );
            } catch (error) {
                let statusCode = 500;
                let errorMessage = 'Internal server error';

                if (error instanceof ValidationError) {
                    statusCode = 400;
                    errorMessage = error.message;
                } else if (error instanceof NotFoundError) {
                    statusCode = 404;
                    errorMessage = error.message;
                } else if (error instanceof UnauthorizedError) {
                    statusCode = 403;
                    errorMessage = error.message;
                } else if (error instanceof ProjectFlowError) {
                    statusCode = 400;
                    errorMessage = error.message;
                } else if (error instanceof Error) {
                    errorMessage = error.message;
                }

                return NextResponse.json(
                    { success: false, error: errorMessage },
                    { status: statusCode }
                );
            }
        }

        // Invalid request format
        console.log(`[MCP] Invalid request format`);
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: 'Invalid Request',
                },
            },
            { status: 400 }
        );
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[MCP] Error (${duration}ms):`, error);
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32603,
                    message: 'Internal error',
                },
            },
            { status: 500 }
        );
    }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
    // Handle GET requests for OAuth discovery
    // Some MCP clients send GET to check if endpoint exists
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || _request.nextUrl.origin;

    return NextResponse.json(
        {
            message: 'MCP endpoint - use POST with JSON-RPC 2.0 format',
            protocol: 'JSON-RPC 2.0',
            methods: ['tools/list', 'tools/call', 'initialize', 'ping'],
            oauth_discovery: {
                authorization_endpoint: `${apiUrl}/api/oauth/authorize`,
                token_endpoint: `${apiUrl}/api/oauth/token`,
                well_known: {
                    authorization_server: `${apiUrl}/.well-known/oauth-authorization-server`,
                    protected_resource: `${apiUrl}/.well-known/oauth-protected-resource`,
                },
            },
        },
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
}

export async function OPTIONS(): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
