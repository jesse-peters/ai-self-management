import { NextRequest, NextResponse } from 'next/server';
import {
  validateTokenRequest,
  getAuthorizationCode,
  validatePKCE,
} from '@/lib/oauth';
import { createOAuthToken, refreshAccessToken } from '@projectflow/core';

/**
 * OAuth 2.1 Token Endpoint
 * Handles token exchange (authorization code -> tokens) and token refresh
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const url = request.nextUrl.toString();
  console.log(`[OAuth Token] POST ${url}`);
  
  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
      console.log(`[OAuth Token] Request body:`, {
        grant_type: body.grant_type,
        has_code: !!body.code,
        has_refresh_token: !!body.refresh_token,
        client_id: body.client_id,
      });
    } catch {
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
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: error instanceof Error ? error.message : 'Invalid request parameters',
        },
        { status: 400 }
      );
    }

    // Handle different grant types
    console.log(`[OAuth Token] Processing grant_type: ${tokenRequest.grant_type}`);
    if (tokenRequest.grant_type === 'authorization_code') {
      return handleAuthorizationCodeGrant(tokenRequest);
    } else if (tokenRequest.grant_type === 'refresh_token') {
      return handleRefreshTokenGrant(tokenRequest);
    } else {
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
    console.error(`[OAuth Token] Error (${duration}ms):`, error);
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
  tokenRequest: Awaited<ReturnType<typeof validateTokenRequest>>
): Promise<NextResponse> {
  if (!tokenRequest.code) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing code parameter',
      },
      { status: 400 }
    );
  }

  // Get authorization code
  const codeData = await getAuthorizationCode(tokenRequest.code);
  if (!codeData) {
    console.error(`[OAuth Token] Invalid or expired authorization code: ${tokenRequest.code.substring(0, 8)}...`);
    return NextResponse.json(
      {
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code. Authorization codes expire after 10 minutes and can only be used once.',
        error_hint: 'Please initiate a new authorization request at the authorization endpoint.',
      },
      { status: 400 }
    );
  }

  // Validate client_id matches
  if (codeData.clientId !== tokenRequest.client_id) {
    console.error(`[OAuth Token] Client ID mismatch: expected ${codeData.clientId}, got ${tokenRequest.client_id}`);
    return NextResponse.json(
      {
        error: 'invalid_client',
        error_description: `Client ID mismatch. Expected: ${codeData.clientId}, Received: ${tokenRequest.client_id}`,
        error_hint: 'Ensure you use the same client_id that was used during authorization.',
      },
      { status: 400 }
    );
  }

  // Validate redirect_uri matches
  if (tokenRequest.redirect_uri && codeData.redirectUri !== tokenRequest.redirect_uri) {
    console.error(`[OAuth Token] Redirect URI mismatch: expected ${codeData.redirectUri}, got ${tokenRequest.redirect_uri}`);
    return NextResponse.json(
      {
        error: 'invalid_grant',
        error_description: `Redirect URI mismatch. Expected: ${codeData.redirectUri}, Received: ${tokenRequest.redirect_uri}`,
        error_hint: 'Ensure you use the same redirect_uri that was used during authorization.',
      },
      { status: 400 }
    );
  }

  // Validate PKCE if present
  if (codeData.codeChallenge && codeData.codeChallengeMethod) {
    if (!tokenRequest.code_verifier) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Missing code_verifier for PKCE',
        },
        { status: 400 }
      );
    }

    if (!validatePKCE(tokenRequest.code_verifier, codeData.codeChallenge, codeData.codeChallengeMethod)) {
      console.error(`[OAuth Token] PKCE validation failed for code challenge method: ${codeData.codeChallengeMethod}`);
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: `Invalid code_verifier for PKCE challenge method: ${codeData.codeChallengeMethod}`,
          error_hint: 'Ensure the code_verifier matches the code_challenge that was sent during authorization.',
        },
        { status: 400 }
      );
    }
  }

  // Create OAuth tokens
  try {
    const token = await createOAuthToken(
      codeData.userId,
      tokenRequest.client_id,
      codeData.scope
    );

    // Return token response
    return NextResponse.json(
      {
        access_token: token.access_token,
        token_type: token.token_type,
        expires_in: Math.floor((new Date(token.expires_at).getTime() - Date.now()) / 1000),
        refresh_token: token.refresh_token,
        scope: token.scope || '',
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
    console.error('[OAuth Token] Failed to create OAuth token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: `Failed to create access token: ${errorMessage}`,
        error_hint: 'Please try again. If the problem persists, contact support.',
      },
      { status: 500 }
    );
  }
}

async function handleRefreshTokenGrant(
  tokenRequest: Awaited<ReturnType<typeof validateTokenRequest>>
): Promise<NextResponse> {
  if (!tokenRequest.refresh_token) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing refresh_token parameter',
      },
      { status: 400 }
    );
  }

  try {
    // Refresh the access token
    const token = await refreshAccessToken(tokenRequest.refresh_token);

    // Return new token response
    return NextResponse.json(
      {
        access_token: token.access_token,
        token_type: token.token_type,
        expires_in: Math.floor((new Date(token.expires_at).getTime() - Date.now()) / 1000),
        refresh_token: token.refresh_token, // Same refresh token (not rotated for simplicity)
        scope: token.scope || '',
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
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('revoked'))) {
      console.error(`[OAuth Token] Refresh token validation failed: ${error.message}`);
      return NextResponse.json(
        {
          error: 'invalid_grant',
          error_description: error.message,
          error_hint: 'The refresh token may be invalid, expired, or revoked. Please initiate a new authorization flow.',
        },
        { status: 400 }
      );
    }

    console.error('[OAuth Token] Failed to refresh token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: `Failed to refresh access token: ${errorMessage}`,
        error_hint: 'Please try again. If the problem persists, initiate a new authorization flow.',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

