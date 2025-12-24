import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { validateAuthorizationRequest } from '@/lib/oauth';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';
import { generateAuthorizationCode } from '@projectflow/core';

/**
 * OAuth 2.1 Authorization Endpoint (Self-Contained)
 * Generates and stores authorization codes directly without proxying to Supabase OAuth
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:13', message: 'AUTHORIZE ENDPOINT CALLED - Function entry', data: { url: request.nextUrl.toString(), method: 'GET', hasQueryParams: request.nextUrl.searchParams.toString().length > 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
  // #endregion

  const startTime = Date.now();
  const url = request.nextUrl.toString();
  const correlationId = getCorrelationId(request);
  const logger = createRequestLogger(correlationId, 'oauth');

  logger.info({ url, method: 'GET' }, 'OAuth authorize request received');

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:23', message: 'Authorization query parameters received', data: { queryParams, redirectUri: queryParams.redirect_uri, clientId: queryParams.client_id, hasCodeChallenge: !!queryParams.code_challenge }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    logger.debug({ queryParams }, 'Authorization query parameters');

    // Validate authorization request
    let authRequest;
    try {
      authRequest = validateAuthorizationRequest(searchParams);
      logger.info({
        client_id: authRequest.client_id,
        redirect_uri: authRequest.redirect_uri,
        response_type: authRequest.response_type,
        scope: authRequest.scope,
        has_code_challenge: !!authRequest.code_challenge,
        code_challenge_method: authRequest.code_challenge_method,
      }, 'Authorization request validated');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid request';
      logger.warn({
        error: errorMessage,
        queryParams,
      }, 'Authorization request validation failed');
      const redirectUri = searchParams.get('redirect_uri');
      const state = searchParams.get('state');

      if (redirectUri) {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set('error', 'invalid_request');
        errorUrl.searchParams.set('error_description', errorMessage);
        if (state) {
          errorUrl.searchParams.set('state', state);
        }
        return NextResponse.redirect(errorUrl.toString());
      }

      return NextResponse.json(
        { error: 'invalid_request', error_description: errorMessage },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:67', message: 'User check result', data: { hasUser: !!user, hasUserError: !!userError, userError: userError?.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion

    if (userError || !user) {
      logger.info({
        hasUserError: !!userError,
        userError: userError?.message,
      }, 'User not authenticated, redirecting to login');

      // User not authenticated - redirect to login with return URL
      const loginUrl = new URL('/auth/login', request.nextUrl.origin);
      loginUrl.searchParams.set('redirect', request.url);
      loginUrl.searchParams.set('oauth', 'true');
      loginUrl.searchParams.set('client_id', authRequest.client_id);

      // Store OAuth redirect URL in a cookie so callback can retrieve it
      const response = NextResponse.redirect(loginUrl.toString());
      response.cookies.set('oauth_redirect', request.url, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
      });

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:88', message: 'Redirecting to login page', data: { loginUrl: loginUrl.toString(), originalUrl: request.url }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion

      return response;
    }

    const userId = user.id;
    logger.info({ userId }, 'User authenticated');

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:112', message: 'User authenticated, checking client_id', data: { userId, clientId: authRequest.client_id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion

    // Validate client_id
    const clientId = authRequest.client_id;
    const allowedClientIds = process.env.OAUTH_ALLOWED_CLIENT_IDS?.split(',') || ['mcp-client'];

    if (!allowedClientIds.includes(clientId)) {
      logger.warn({
        clientId,
        allowedClientIds,
      }, 'Invalid client_id');
      const errorUrl = new URL(authRequest.redirect_uri);
      errorUrl.searchParams.set('error', 'unauthorized_client');
      errorUrl.searchParams.set('error_description', `Invalid client_id: ${clientId}`);
      if (authRequest.state) {
        errorUrl.searchParams.set('state', authRequest.state);
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    // Generate authorization code
    const code = generateAuthorizationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:138', message: 'Code generated, inserting to DB', data: { codePrefix: code.substring(0, 8), userId, clientId, hasCodeChallenge: !!authRequest.code_challenge }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'FIX' }) }).catch(() => { });
    // #endregion

    // Store authorization code in database
    // Use the authenticated session client instead of service role
    // This uses the user's session token which should have proper permissions
    const { error: insertError } = await supabase
      .from('oauth_authorization_codes')
      .insert({
        code,
        client_id: clientId,
        user_id: userId,
        redirect_uri: authRequest.redirect_uri,
        scope: authRequest.scope || '',
        code_challenge: authRequest.code_challenge,
        code_challenge_method: authRequest.code_challenge_method || 'S256',
        expires_at: expiresAt.toISOString(),
      });

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:154', message: 'DB insert result', data: { hasError: !!insertError, errorMessage: insertError?.message, errorCode: insertError?.code, errorDetails: insertError?.details }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'FIX' }) }).catch(() => { });
    // #endregion

    if (insertError) {
      logger.error({
        error: insertError.message,
        code: insertError.code,
      }, 'Failed to store authorization code');
      const errorUrl = new URL(authRequest.redirect_uri);
      errorUrl.searchParams.set('error', 'server_error');
      errorUrl.searchParams.set('error_description', 'Failed to generate authorization code');
      if (authRequest.state) {
        errorUrl.searchParams.set('state', authRequest.state);
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    logger.info({
      codePrefix: code.substring(0, 8),
      userId,
      clientId,
      expiresAt: expiresAt.toISOString(),
      hasCodeChallenge: !!authRequest.code_challenge,
    }, 'Authorization code generated and stored');

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:160', message: 'Code generated, preparing redirect', data: { codePrefix: code.substring(0, 8), redirectUri: authRequest.redirect_uri, hasState: !!authRequest.state, isCursorScheme: authRequest.redirect_uri.startsWith('cursor://') }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion

    // Redirect to callback with authorization code
    const callbackUrl = new URL(authRequest.redirect_uri);
    callbackUrl.searchParams.set('code', code);
    if (authRequest.state) {
      callbackUrl.searchParams.set('state', authRequest.state);
    }

    const duration = Date.now() - startTime;
    logger.info({
      duration,
      redirectUri: authRequest.redirect_uri,
      codePrefix: code.substring(0, 8),
    }, 'Redirecting to callback with authorization code');

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:177', message: 'About to redirect', data: { callbackUrl: callbackUrl.toString(), redirectUriLength: callbackUrl.toString().length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion

    return NextResponse.redirect(callbackUrl.toString());
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'OAuth authorize error');
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
