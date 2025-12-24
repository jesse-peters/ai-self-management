import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { validateAuthorizationRequest } from '@/lib/oauth';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

/**
 * OAuth 2.1 Authorization Endpoint
 * Generates and stores authorization codes for OAuth 2.1 flow
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:11', message: 'AUTHORIZE ENDPOINT CALLED - Function entry', data: { url: request.nextUrl.toString(), method: 'GET', hasQueryParams: request.nextUrl.searchParams.toString().length > 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
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
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:23', message: 'Authorization query parameters received', data: { queryParams, redirectUri: queryParams.redirect_uri, clientId: queryParams.client_id, hasCodeChallenge: !!queryParams.code_challenge }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
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
    // Use getUser() instead of getSession() to verify token with Supabase Auth server
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:67', message: 'User check result', data: { hasUser: !!user, hasUserError: !!userError, userError: userError?.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
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
      fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:88', message: 'Redirecting to login page', data: { loginUrl: loginUrl.toString(), originalUrl: request.url }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
      // #endregion

      return response;
    }

    const userId = user.id;
    logger.info({ userId }, 'User authenticated');

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

    // Proxy to Supabase OAuth 2.1 server
    // Convert cursor:// deep links to our callback endpoint for Supabase compatibility
    let proxyRedirectUri = authRequest.redirect_uri;
    if (authRequest.redirect_uri.startsWith('cursor://')) {
      // Supabase doesn't support custom schemes, so use our callback endpoint
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      proxyRedirectUri = `${apiUrl}/api/oauth/callback`;
      logger.info({
        originalRedirectUri: authRequest.redirect_uri,
        proxyRedirectUri,
      }, 'Converting cursor:// deep link to callback endpoint for Supabase');
    }

    // Build Supabase OAuth authorize URL
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      logger.error({
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      }, 'Missing SUPABASE_URL environment variable');
      const errorUrl = new URL(authRequest.redirect_uri);
      errorUrl.searchParams.set('error', 'server_error');
      errorUrl.searchParams.set('error_description', 'OAuth server configuration error: SUPABASE_URL is not set');
      if (authRequest.state) {
        errorUrl.searchParams.set('state', authRequest.state);
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    // Validate Supabase URL format
    try {
      new URL(supabaseUrl);
    } catch {
      logger.error({
        supabaseUrl,
      }, 'Invalid SUPABASE_URL format');
      const errorUrl = new URL(authRequest.redirect_uri);
      errorUrl.searchParams.set('error', 'server_error');
      errorUrl.searchParams.set('error_description', 'Invalid SUPABASE_URL configuration');
      if (authRequest.state) {
        errorUrl.searchParams.set('state', authRequest.state);
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    // Warn if using localhost in production-like environment
    if (supabaseUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      logger.warn({
        supabaseUrl,
        nodeEnv: process.env.NODE_ENV,
      }, 'Using localhost Supabase URL in production environment - this may indicate a configuration issue');
    }

    // Validate required parameters
    if (!clientId) {
      logger.error('Missing client_id in authorization request');
      const errorUrl = new URL(authRequest.redirect_uri);
      errorUrl.searchParams.set('error', 'invalid_request');
      errorUrl.searchParams.set('error_description', 'Missing client_id parameter');
      if (authRequest.state) {
        errorUrl.searchParams.set('state', authRequest.state);
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    if (!proxyRedirectUri) {
      logger.error('Missing redirect_uri in authorization request');
      const errorUrl = new URL(authRequest.redirect_uri);
      errorUrl.searchParams.set('error', 'invalid_request');
      errorUrl.searchParams.set('error_description', 'Missing redirect_uri parameter');
      if (authRequest.state) {
        errorUrl.searchParams.set('state', authRequest.state);
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    const supabaseAuthorizeUrl = new URL(`${supabaseUrl}/auth/v1/oauth/authorize`);
    supabaseAuthorizeUrl.searchParams.set('client_id', clientId);
    supabaseAuthorizeUrl.searchParams.set('response_type', authRequest.response_type);
    supabaseAuthorizeUrl.searchParams.set('redirect_uri', proxyRedirectUri);
    if (authRequest.scope) {
      supabaseAuthorizeUrl.searchParams.set('scope', authRequest.scope);
    }
    if (authRequest.state) {
      supabaseAuthorizeUrl.searchParams.set('state', authRequest.state);
    }
    if (authRequest.code_challenge) {
      supabaseAuthorizeUrl.searchParams.set('code_challenge', authRequest.code_challenge);
    }
    if (authRequest.code_challenge_method) {
      supabaseAuthorizeUrl.searchParams.set('code_challenge_method', authRequest.code_challenge_method);
    }

    logger.info({
      supabaseAuthorizeUrl: supabaseAuthorizeUrl.toString(),
      supabaseUrl,
      clientId,
      redirectUri: proxyRedirectUri,
      hasCodeChallenge: !!authRequest.code_challenge,
      codeChallengeMethod: authRequest.code_challenge_method,
      scope: authRequest.scope,
      state: authRequest.state ? 'present' : 'missing',
    }, 'Proxying authorization request to Supabase OAuth 2.1');

    // Redirect to Supabase OAuth authorize endpoint
    // Supabase will handle user authentication and authorization code generation
    return NextResponse.redirect(supabaseAuthorizeUrl.toString());
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
