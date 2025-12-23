import { NextRequest, NextResponse } from 'next/server';
import { validateOAuthToken } from '@/lib/oauth';
import { getTokenByAccessToken } from '@projectflow/core';

/**
 * OAuth Token Validation Test Endpoint
 * Useful for debugging OAuth token issues
 * 
 * GET /api/oauth/test - Returns token information if valid
 * Requires Authorization: Bearer <token> header
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const url = request.nextUrl.toString();
  console.log(`[OAuth Test] GET ${url}`);

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'missing_authorization',
          error_description: 'Missing or invalid Authorization header',
          error_hint: 'Include Authorization: Bearer <token> header',
        },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    console.log(`[OAuth Test] Validating token: ${token.substring(0, 20)}...`);

    // Validate token and get user ID
    let userId: string;
    try {
      userId = await validateOAuthToken(token);
      console.log(`[OAuth Test] Token validated, userId: ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OAuth Test] Token validation failed: ${errorMessage}`);
      return NextResponse.json(
        {
          error: 'invalid_token',
          error_description: errorMessage,
          error_hint: 'The token may be expired, revoked, or invalid. Please obtain a new token.',
        },
        { status: 401 }
      );
    }

    // Get full token information
    const tokenInfo = await getTokenByAccessToken(token);
    if (!tokenInfo) {
      return NextResponse.json(
        {
          error: 'token_not_found',
          error_description: 'Token validated but not found in database',
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[OAuth Test] Success (${duration}ms)`);

    // Return token information (excluding sensitive data)
    return NextResponse.json(
      {
        valid: true,
        user_id: userId,
        token_info: {
          id: tokenInfo.id,
          client_id: tokenInfo.client_id,
          scope: tokenInfo.scope,
          token_type: tokenInfo.token_type,
          expires_at: tokenInfo.expires_at,
          created_at: tokenInfo.created_at,
          revoked_at: tokenInfo.revoked_at,
          is_expired: new Date(tokenInfo.expires_at) < new Date(),
          is_revoked: tokenInfo.revoked_at !== null,
          expires_in_seconds: Math.max(0, Math.floor((new Date(tokenInfo.expires_at).getTime() - Date.now()) / 1000)),
        },
        validation_time_ms: duration,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[OAuth Test] Error (${duration}ms):`, error);
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

