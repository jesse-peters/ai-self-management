import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import {
  validateAuthorizationRequest,
  storeAuthorizationCode,
  generateOAuthAuthorizationCode,
} from '@/lib/oauth';

/**
 * OAuth 2.1 Authorization Endpoint
 * Handles authorization code flow initiation
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const url = request.nextUrl.toString();
  console.log(`[OAuth Authorize] GET ${url}`);
  
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    console.log(`[OAuth Authorize] Query params:`, Object.fromEntries(searchParams.entries()));

    // Validate authorization request
    let authRequest;
    try {
      authRequest = validateAuthorizationRequest(searchParams);
      console.log(`[OAuth Authorize] Validated request:`, {
        client_id: authRequest.client_id,
        redirect_uri: authRequest.redirect_uri,
        response_type: authRequest.response_type,
        scope: authRequest.scope,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid request';
      console.error(`[OAuth Authorize] Validation error:`, errorMessage);
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
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
      console.log(`[OAuth Authorize] User not authenticated, redirecting to login`);
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
      return response;
    }

    const userId = session.user.id;
    console.log(`[OAuth Authorize] User authenticated: ${userId}`);

    // Validate client_id (for now, accept any client_id - in production, validate against registered clients)
    const clientId = authRequest.client_id;
    const allowedClientIds = process.env.OAUTH_ALLOWED_CLIENT_IDS?.split(',') || ['mcp-client'];
    
    if (!allowedClientIds.includes(clientId)) {
      console.error(`[OAuth Authorize] Invalid client_id: ${clientId}. Allowed: ${allowedClientIds.join(', ')}`);
      const errorUrl = new URL(authRequest.redirect_uri);
      errorUrl.searchParams.set('error', 'unauthorized_client');
      errorUrl.searchParams.set('error_description', `Invalid client_id: ${clientId}. Please register your client first at ${request.nextUrl.origin}/api/oauth/register`);
      if (authRequest.state) {
        errorUrl.searchParams.set('state', authRequest.state);
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    // Generate authorization code
    const code = generateOAuthAuthorizationCode();
    console.log(`[OAuth Authorize] Generated code: ${code.substring(0, 8)}...`);

    // Store authorization code
    storeAuthorizationCode(
      code,
      userId,
      clientId,
      authRequest.redirect_uri,
      authRequest.scope || 'projects:read projects:write tasks:read tasks:write sessions:read sessions:write',
      authRequest.code_challenge,
      authRequest.code_challenge_method
    );

    // Redirect to callback with authorization code
    const redirectUrl = new URL(authRequest.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (authRequest.state) {
      redirectUrl.searchParams.set('state', authRequest.state);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[OAuth Authorize] Success (${duration}ms), redirecting to: ${redirectUrl.toString()}`);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[OAuth Authorize] Error (${duration}ms):`, error);
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

