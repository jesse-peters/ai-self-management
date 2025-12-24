import { NextRequest, NextResponse } from 'next/server';
import { validateTokenRequest } from '@/lib/oauth';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';
import { createOAuthToken, refreshAccessToken, verifyPKCE } from '@projectflow/core';
import { createServiceRoleClient } from '@projectflow/db';

/**
 * OAuth 2.1 Token Endpoint (Self-Contained)
 * Handles token exchange and refresh using our own OAuth implementation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/token/route.ts:11', message: 'TOKEN ENDPOINT CALLED', data: { url: request.nextUrl.toString(), method: 'POST' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
  // #endregion

  const startTime = Date.now();
  const url = request.nextUrl.toString();
  const correlationId = getCorrelationId(request);
  const logger = createRequestLogger(correlationId, 'oauth');

  logger.info({ url, method: 'POST' }, 'OAuth token request received');

  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
      logger.debug({
        grant_type: body.grant_type,
        has_code: !!body.code,
        has_refresh_token: !!body.refresh_token,
        client_id: body.client_id,
      }, 'Token request body parsed');
    } catch {
      logger.warn('Invalid JSON in request body');
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate token request
    let tokenRequest;
    try {
      tokenRequest = validateTokenRequest(body);
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Token request validation failed');
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: error instanceof Error ? error.message : 'Invalid request parameters',
        },
        { status: 400 }
      );
    }

    // Handle different grant types
    logger.info({ grant_type: tokenRequest.grant_type }, 'Processing grant type');
    if (tokenRequest.grant_type === 'authorization_code') {
      return handleAuthorizationCodeGrant(tokenRequest, request, logger);
    } else if (tokenRequest.grant_type === 'refresh_token') {
      return handleRefreshTokenGrant(tokenRequest, request, logger);
    } else {
      logger.warn({ grant_type: tokenRequest.grant_type }, 'Unsupported grant type');
      return NextResponse.json(
        {
          error: 'unsupported_grant_type',
          error_description: `Grant type ${tokenRequest.grant_type} is not supported`,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'OAuth token request error');
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

async function handleAuthorizationCodeGrant(
  tokenRequest: Awaited<ReturnType<typeof validateTokenRequest>>,
  request: NextRequest,
  logger: ReturnType<typeof createRequestLogger>
): Promise<NextResponse> {
  if (!tokenRequest.code) {
    logger.warn('Missing authorization code');
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing code parameter',
      },
      { status: 400 }
    );
  }

  if (!tokenRequest.code_verifier) {
    logger.warn('Missing code_verifier for PKCE');
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing code_verifier parameter (PKCE required)',
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    // Look up authorization code in database
    const { data: authCode, error: lookupError } = await supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', tokenRequest.code)
      .single();

    if (lookupError || !authCode) {
      logger.warn({
        error: lookupError?.message,
        codePrefix: tokenRequest.code.substring(0, 8),
      }, 'Authorization code not found');
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code',
        },
        { status: 400 }
      );
    }

    // Check if code is expired
    const expiresAt = new Date(authCode.expires_at);
    if (expiresAt < new Date()) {
      logger.warn({
        codePrefix: tokenRequest.code.substring(0, 8),
        expiresAt: authCode.expires_at,
      }, 'Authorization code expired');

      // Delete expired code
      await supabase
        .from('oauth_authorization_codes')
        .delete()
        .eq('code', tokenRequest.code);

      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Authorization code has expired',
        },
        { status: 400 }
      );
    }

    // Check if code has already been used
    if (authCode.used_at) {
      logger.warn({
        codePrefix: tokenRequest.code.substring(0, 8),
        usedAt: authCode.used_at,
      }, 'Authorization code already used');
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Authorization code has already been used',
        },
        { status: 400 }
      );
    }

    // Verify client_id matches
    if (authCode.client_id !== tokenRequest.client_id) {
      logger.warn({
        expectedClientId: authCode.client_id,
        providedClientId: tokenRequest.client_id,
      }, 'Client ID mismatch');
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Client ID does not match authorization code',
        },
        { status: 400 }
      );
    }

    // Verify redirect_uri matches (if provided)
    if (tokenRequest.redirect_uri && authCode.redirect_uri !== tokenRequest.redirect_uri) {
      logger.warn({
        expectedRedirectUri: authCode.redirect_uri,
        providedRedirectUri: tokenRequest.redirect_uri,
      }, 'Redirect URI mismatch');
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Redirect URI does not match authorization request',
        },
        { status: 400 }
      );
    }

    // Verify PKCE code_verifier
    if (!authCode.code_challenge) {
      logger.error({
        codePrefix: tokenRequest.code.substring(0, 8),
      }, 'Authorization code missing code_challenge');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Authorization code missing PKCE challenge',
        },
        { status: 500 }
      );
    }

    try {
      const pkceValid = verifyPKCE(
        tokenRequest.code_verifier,
        authCode.code_challenge,
        authCode.code_challenge_method || 'S256'
      );

      if (!pkceValid) {
        logger.warn({
          codePrefix: tokenRequest.code.substring(0, 8),
        }, 'PKCE verification failed');
        return NextResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'PKCE verification failed',
          },
          { status: 400 }
        );
      }
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'PKCE verification error');
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid PKCE verifier',
        },
        { status: 400 }
      );
    }

    logger.info({
      codePrefix: tokenRequest.code.substring(0, 8),
      userId: authCode.user_id,
      clientId: authCode.client_id,
    }, 'Authorization code verified, PKCE valid');

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/token/route.ts:254', message: 'PKCE verified, creating token', data: { userId: authCode.user_id, clientId: authCode.client_id, scope: authCode.scope }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
    // #endregion

    // Mark code as used
    const { error: updateError } = await supabase
      .from('oauth_authorization_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('code', tokenRequest.code);

    if (updateError) {
      logger.error({
        error: updateError.message,
      }, 'Failed to mark authorization code as used');
      // Continue anyway - token generation is more important
    }

    // Generate OAuth token pair
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const audience = `${apiUrl}/api/mcp`;

    const tokenResponse = await createOAuthToken(
      authCode.user_id,
      authCode.client_id,
      authCode.scope || 'projects:read projects:write tasks:read tasks:write sessions:read sessions:write',
      audience
    );

    logger.info({
      userId: authCode.user_id,
      clientId: authCode.client_id,
      expiresIn: tokenResponse.expires_in,
      scope: tokenResponse.scope,
    }, 'OAuth token created successfully');

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/token/route.ts:289', message: 'Token response ready', data: { hasAccessToken: !!tokenResponse.access_token, hasRefreshToken: !!tokenResponse.refresh_token, expiresIn: tokenResponse.expires_in, tokenType: tokenResponse.token_type }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
    // #endregion

    // Delete authorization code (one-time use)
    await supabase
      .from('oauth_authorization_codes')
      .delete()
      .eq('code', tokenRequest.code);

    return NextResponse.json(tokenResponse);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Token exchange error');
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'Token exchange failed',
      },
      { status: 500 }
    );
  }
}

async function handleRefreshTokenGrant(
  tokenRequest: Awaited<ReturnType<typeof validateTokenRequest>>,
  request: NextRequest,
  logger: ReturnType<typeof createRequestLogger>
): Promise<NextResponse> {
  if (!tokenRequest.refresh_token) {
    logger.warn('Missing refresh token');
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing refresh_token parameter',
      },
      { status: 400 }
    );
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const audience = `${apiUrl}/api/mcp`;

    const tokenResponse = await refreshAccessToken(tokenRequest.refresh_token, audience);

    logger.info({
      refreshTokenPrefix: tokenRequest.refresh_token.substring(0, 8),
      expiresIn: tokenResponse.expires_in,
    }, 'Token refreshed successfully');

    return NextResponse.json(tokenResponse);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Token refresh error');

    return NextResponse.json(
      {
        error: 'invalid_grant',
        error_description: 'Token refresh failed',
      },
      { status: 400 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
