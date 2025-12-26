import { NextRequest, NextResponse } from 'next/server';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { methodRequiresAuth } from '@/lib/mcp/mcpAuthMiddleware';
import { handleHttpRequest, createJsonRpcError } from '@/lib/mcp/httpAdapter';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';
import { verifyAccessToken } from '@projectflow/core';

/**
 * Extracts and verifies authentication from the request
 * Returns AuthInfo if authentication is successful, null otherwise
 */
async function extractAuthInfo(request: NextRequest, audience: string): Promise<AuthInfo | null> {
    const logger = createRequestLogger('mcp', 'auth');
    const authHeader = request.headers.get('Authorization');
    const debug = process.env.MCP_DEBUG === 'true';

    if (debug) {
        console.log('[AUTH] Authorization extraction started', {
            hasAuthHeader: !!authHeader,
            headerLength: authHeader?.length || 0,
            expectedAudience: audience,
        });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (debug) console.log('[AUTH] No Bearer token found');
        logger.debug('No Bearer token in Authorization header');
        return null;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    try {
        if (debug) {
            console.log('[AUTH] Token extraction', {
                tokenLength: token.length,
                tokenAlgorithm: token.split('.')[0] ? Buffer.from(token.split('.')[0], 'base64').toString() : 'unknown',
                tokenPreview: `${token.substring(0, 20)}...${token.substring(token.length - 20)}`,
            });
        }

        logger.debug({ tokenPreview: token.substring(0, 20), tokenLength: token.length }, 'Verifying access token');

        // Use our existing Supabase JWT verification
        const claims = await verifyAccessToken(token, audience);

        // Derive app URL from audience or use environment variable with fallback to request origin
        // Audience format is: ${apiUrl}/api/mcp, so we can extract the base URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (audience.endsWith('/api/mcp') ? audience.slice(0, -8) : null) ||
                      request.nextUrl.origin;

        if (debug) {
            console.log('[AUTH] Token verified successfully', {
                userId: claims.sub,
                role: claims.role,
                audience: claims.aud,
                expiresAt: new Date(claims.exp * 1000).toISOString(),
                email: claims.email,
            });
        }

        logger.debug({
            userId: claims.sub,
            role: claims.role,
            hasEmail: !!claims.email,
            exp: claims.exp,
        }, 'Token verified successfully');

        // Map our token claims to MCP AuthInfo format (SDK v1.25.1)
        // The SDK's AuthInfo has required fields: token, clientId, scopes
        // All custom claims go in the `extra` object
        const authInfo: AuthInfo = {
            token,
            clientId: 'mcp-client',
            scopes: [], // Supabase doesn't use OAuth scopes in this way
            expiresAt: claims.exp,
            extra: {
                // Store all Supabase-specific claims in extra
                issuer: appUrl,
                subject: claims.sub,
                audience: claims.aud,
                userId: claims.sub,
                role: claims.role,
                email: claims.email,
                iat: claims.iat,
            },
        };

        return authInfo;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (debug) {
            console.log('[AUTH] Token verification failed', {
                error: errorMessage,
                tokenPreview: `${token.substring(0, 20)}...`,
                tokenLength: token.length,
            });
        }

        logger.error({
            error: errorMessage,
            tokenPreview: token.substring(0, 20),
            tokenLength: token.length,
        }, 'Token verification failed');

        return null;
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const url = request.nextUrl.toString();
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'mcp');

    logger.info({
        url,
        method: 'POST',
        hasAuthHeader: request.headers.has('Authorization'),
        authHeaderPreview: request.headers.get('Authorization')?.substring(0, 30) || 'none',
    }, 'MCP request received');

    try {
        // Extract and verify OAuth token
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const audience = `${apiUrl}/api/mcp`;

        logger.debug({
            apiUrl,
            expectedAudience: audience,
            requestOrigin: request.nextUrl.origin,
        }, 'Extracting auth info');

        const authInfo = await extractAuthInfo(request, audience);

        logger.debug({
            hasAuth: authInfo !== null,
            hasToken: !!authInfo?.token,
            userId: authInfo?.extra?.userId as string | undefined,
            tokenLength: authInfo?.token?.length || 0,
        }, 'Auth info extracted');

        // Parse request body to check method
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            logger.warn('Failed to parse request body as JSON');
            return NextResponse.json(
                { success: false, error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const jsonRpcRequest = body as any;
        const method = jsonRpcRequest?.method;

        logger.debug({
            method,
            requestId: jsonRpcRequest?.id,
            requiresAuth: method ? methodRequiresAuth(method) : false,
            hasAuth: !!authInfo,
        }, 'Processing MCP method');

        // Check if method requires authentication
        if (method && methodRequiresAuth(method) && !authInfo) {
            // Authentication is required but not provided
            logger.warn({
                method,
                hasToken: !!request.headers.get('Authorization'),
                reason: request.headers.get('Authorization') ? 'token_validation_failed' : 'no_token_provided',
            }, 'Authentication required but not provided');

            // Build authorization URI - point to user-friendly OAuth page instead of API endpoint
            // This ensures that when users manually click the URL, they see a proper page instead of redirects
            const cursorRedirectUri = 'cursor://anysphere.cursor-mcp/oauth/callback';
            // Point to /oauth/authorize page which will handle the OAuth flow and redirect to /api/oauth/authorize
            // The API endpoint will then handle PKCE and return the authorization code
            const authUri = `${apiUrl}/oauth/authorize?client_id=mcp-client&response_type=code&scope=projects:read+projects:write+tasks:read+tasks:write+sessions:read+sessions:write&redirect_uri=${encodeURIComponent(cursorRedirectUri)}`;

            const wwwAuthenticateHeader = `Bearer error="invalid_token", error_description="Authentication required", authorization_uri="${authUri}", resource_metadata="${apiUrl}/.well-known/oauth-protected-resource"`;

            const errorData = {
                oauth_required: true,
                error_type: 'authentication_required',
                authorization_uri: authUri,
                resource_metadata: `${apiUrl}/.well-known/oauth-protected-resource`,
            };

            const jsonRpcError = createJsonRpcError(jsonRpcRequest?.id || null, -32001, 'Unauthorized', errorData);

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
        // Pass the already-parsed body and authInfo
        const response = await handleHttpRequest(body, authInfo);

        const duration = Date.now() - startTime;
        logger.info({
            method,
            duration,
            status: response.status,
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

    const response: any = {
        message: 'MCP endpoint - use POST with JSON-RPC 2.0 format',
        protocol: 'JSON-RPC 2.0',
        methods: ['tools/list', 'tools/call', 'resources/list', 'resources/read', 'prompts/list', 'prompts/get', 'initialize', 'ping', 'notifications/initialized'],
        oauth_discovery: {
            authorization_server_metadata: `${apiUrl}/.well-known/oauth-authorization-server`,
            protected_resource_metadata: `${apiUrl}/.well-known/oauth-protected-resource`,
        },
    };

    // In development, provide a token generation endpoint for local testing
    if (process.env.NODE_ENV === 'development') {
        response.development_only = {
            token_endpoint: `${apiUrl}/api/mcp/token`,
            note: 'This endpoint is only available in development. Generate a token by calling GET /api/mcp/token and use it in the Authorization header as "Bearer <token>"'
        };
    }

    return NextResponse.json(response, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
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
