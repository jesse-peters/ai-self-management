import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
import type { Database } from '@projectflow/db';

interface MCPRequest {
    name: string;
    parameters: Record<string, unknown>;
}

interface MCPResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}

async function verifyJWT(token: string): Promise<string> {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error('Missing Supabase configuration');
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            throw new Error('Invalid token');
        }

        return user.id;
    } catch (error) {
        throw new Error('Authentication failed');
    }
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
                status: parameters.status as any,
                priority: parameters.priority as any,
            });

        case 'list_tasks':
            return listTasks(userId, parameters.projectId as string, {
                status: parameters.status as 'todo' | 'in_progress' | 'done' | undefined,
                priority: parameters.priority as 'low' | 'medium' | 'high' | undefined,
            });

        case 'update_task':
            return updateTask(userId, parameters.taskId as string, {
                title: parameters.title as any,
                description: parameters.description as any,
                status: parameters.status as any,
                priority: parameters.priority as any,
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

export async function POST(request: NextRequest): Promise<NextResponse<MCPResponse>> {
    try {
        // Extract JWT from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Missing or invalid Authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.slice(7);

        // Verify JWT and get userId
        let userId: string;
        try {
            userId = await verifyJWT(token);
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Parse request body
        let body: MCPRequest;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        // Validate tool name and parameters
        if (!body.name || typeof body.name !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Missing or invalid tool name' },
                { status: 400 }
            );
        }

        if (!body.parameters || typeof body.parameters !== 'object') {
            return NextResponse.json(
                { success: false, error: 'Missing or invalid parameters' },
                { status: 400 }
            );
        }

        // Handle the tool call
        try {
            const result = await handleToolCall(userId, body.name, body.parameters);
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
    } catch (error) {
        console.error('MCP endpoint error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

