import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

/**
 * OAuth 2.1 Token Revocation Endpoint (Proxy to Supabase OAuth)
 * Revokes access tokens or refresh tokens
 * Per OAuth spec, revocation should be idempotent (always return 200)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request);
  const logger = createRequestLogger(correlationId, 'oauth');

  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (error) {
      logger.warn('Invalid JSON in revoke request');
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
      logger.warn('Missing token parameter in revoke request');
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Missing token parameter',
        },
        { status: 400 }
      );
    }

    try {
      // Forward to Supabase revocation endpoint
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const revokeUrl = `${supabaseUrl}/auth/v1/oauth/revoke`;

      const payload: Record<string, string> = {
        token,
      };

      if (tokenTypeHint) {
        payload.token_type_hint = tokenTypeHint;
      }

      logger.debug({
        hasTokenTypeHint: !!tokenTypeHint,
      }, 'Forwarding token revocation to Supabase');

      const response = await fetch(revokeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn({
          statusCode: response.status,
        }, 'Supabase token revocation returned non-200');
        // Per OAuth spec, still return 200 for idempotent operations
        return NextResponse.json({}, { status: 200 });
      }

      logger.info('Token revoked successfully');
      return NextResponse.json({}, { status: 200 });
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Token revocation failed');
      // Per OAuth spec, revocation should be idempotent - always return 200
      return NextResponse.json({}, { status: 200 });
    }
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'OAuth revoke endpoint error');
    // Per OAuth spec, revocation should be idempotent - always return 200
    return NextResponse.json({}, { status: 200 });
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
