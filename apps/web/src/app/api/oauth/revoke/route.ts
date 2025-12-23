import { NextRequest, NextResponse } from 'next/server';
import { revokeOAuthToken, revokeOAuthRefreshToken } from '@/lib/oauth';

/**
 * OAuth 2.1 Token Revocation Endpoint
 * Revokes access tokens or refresh tokens
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const token = body.token as string;
    const tokenTypeHint = body.token_type_hint as string | undefined;

    if (!token) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Missing token parameter',
        },
        { status: 400 }
      );
    }

    try {
      // Try to revoke as access token first, then as refresh token
      // OAuth spec says we should accept both and try to revoke
      if (tokenTypeHint === 'access_token' || !tokenTypeHint) {
        try {
          await revokeOAuthToken(token);
          return NextResponse.json({}, { status: 200 });
        } catch {
          // If it fails, try as refresh token
        }
      }

      if (tokenTypeHint === 'refresh_token' || !tokenTypeHint) {
        try {
          await revokeOAuthRefreshToken(token);
          return NextResponse.json({}, { status: 200 });
        } catch {
          // If both fail, still return 200 per OAuth spec
          // (revocation should be idempotent)
        }
      }

      // Return success even if token wasn't found (idempotent operation)
      return NextResponse.json({}, { status: 200 });
    } catch (error) {
      console.error('Failed to revoke token:', error);
      // Still return 200 per OAuth spec (revocation should be idempotent)
      return NextResponse.json({}, { status: 200 });
    }
  } catch (error) {
    console.error('OAuth revoke endpoint error:', error);
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Internal server error',
      },
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

