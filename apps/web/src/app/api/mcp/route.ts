import { NextRequest, NextResponse } from 'next/server';
import { extractAuthContext, methodRequiresAuth } from '@/lib/mcp/authMiddleware';
import { handleHttpRequest, createJsonRpcError } from '@/lib/mcp/httpAdapter';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const url = request.nextUrl.toString();
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'mcp');

    logger.info({ url, method: 'POST' }, 'MCP request received');

    try {
        // Extract and verify OAuth token
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const audience = `${apiUrl}/api/mcp`;
        const authContext = await extractAuthContext(request, audience);

        logger.debug({
            hasAuth: authContext.claims !== null,
            userId: authContext.userId,
        }, 'Auth context extracted');

        // Parse request body to check method
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const jsonRpcRequest = body as any;
        const method = jsonRpcRequest?.method;

        // Check if method requires authentication
        if (method && methodRequiresAuth(method) && !authContext.claims) {
            // Authentication is required but not provided
            logger.warn({ method }, 'Authentication required but not provided');

            // Build authorization URI - use cursor:// redirect_uri that Cursor registered with
            const cursorRedirectUri = 'cursor://anysphere.cursor-mcp/oauth/callback';
            const authUri = `${apiUrl}/api/oauth/authorize?client_id=mcp-client&response_type=code&scope=projects:read+projects:write+tasks:read+tasks:write+sessions:read+sessions:write&redirect_uri=${encodeURIComponent(cursorRedirectUri)}`;

            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'mcp/route.ts:46', message: 'Building OAuth authorization URI for 401 response', data: { apiUrl, authUri, cursorRedirectUri, method }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
            // #endregion

            const wwwAuthenticateHeader = `Bearer error="invalid_token", error_description="Authentication required", authorization_uri="${authUri}", resource_metadata="${apiUrl}/.well-known/oauth-protected-resource"`;

            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'mcp/route.ts:56', message: '401 response with WWW-Authenticate header', data: { headerLength: wwwAuthenticateHeader.length, hasAuthUri: wwwAuthenticateHeader.includes('authorization_uri'), status: 401 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
            // #endregion

            const errorData = {
                oauth_required: true,
                error_type: 'authentication_required',
                authorization_uri: authUri,
                resource_metadata: `${apiUrl}/.well-known/oauth-protected-resource`,
            };

            const jsonRpcError = createJsonRpcError(jsonRpcRequest?.id || null, -32001, 'Unauthorized', errorData);

            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'mcp/route.ts:65', message: 'JSON-RPC error response created', data: { errorCode: jsonRpcError.error?.code, errorMessage: jsonRpcError.error?.message, hasErrorData: !!jsonRpcError.error?.data, errorDataKeys: Object.keys(errorData), authUriInData: !!errorData.authorization_uri }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'G' }) }).catch(() => { });
            // #endregion

            return NextResponse.json(
                jsonRpcError,
                {
                    status: 401,
                    headers: {
                        'WWW-Authenticate': wwwAuthenticateHeader,
                    },
                }
            );
        }

        // Handle the HTTP request through the MCP adapter
        // Pass the already-parsed body to avoid double-parsing
        const response = await handleHttpRequest(body, authContext);

        const duration = Date.now() - startTime;
        logger.info({
            method,
            duration,
            hasError: !response.ok,
        }, 'MCP response sent');

        return response;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error({
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error?.constructor?.name,
            stack: error instanceof Error ? error.stack : undefined,
        }, 'MCP request error');

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
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || _request.nextUrl.origin;

    return NextResponse.json(
        {
            message: 'MCP endpoint - use POST with JSON-RPC 2.0 format',
            protocol: 'JSON-RPC 2.0',
            methods: ['tools/list', 'tools/call', 'resources/list', 'resources/read', 'prompts/list', 'prompts/get', 'initialize', 'ping', 'notifications/initialized'],
            oauth_discovery: {
                authorization_server_metadata: `${apiUrl}/.well-known/oauth-authorization-server`,
                protected_resource_metadata: `${apiUrl}/.well-known/oauth-protected-resource`,
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
