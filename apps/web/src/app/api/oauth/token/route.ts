import { NextRequest, NextResponse } from 'next/server';
import { validateTokenRequest } from '@/lib/oauth';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

/**
 * OAuth 2.1 Token Endpoint
 * Handles token exchange and refresh using our own OAuth implementation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
      return handleAuthorizationCodeGrant(tokenRequest, logger);
    } else if (tokenRequest.grant_type === 'refresh_token') {
      return handleRefreshTokenGrant(tokenRequest, logger);
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

  try {
    // Proxy token exchange to Supabase OAuth 2.1 server
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      logger.error({
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      }, 'Missing SUPABASE_URL environment variable');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'OAuth server configuration error: SUPABASE_URL is not set',
        },
        { status: 500 }
      );
    }

    // Validate Supabase URL format
    try {
      new URL(supabaseUrl);
    } catch {
      logger.error({
        supabaseUrl,
      }, 'Invalid SUPABASE_URL format');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Invalid SUPABASE_URL configuration',
        },
        { status: 500 }
      );
    }

    const supabaseTokenUrl = `${supabaseUrl}/auth/v1/oauth/token`;

    // Build request body for Supabase
    const requestBody: Record<string, string> = {
      grant_type: 'authorization_code',
      code: tokenRequest.code,
      client_id: tokenRequest.client_id,
    };

    if (tokenRequest.redirect_uri) {
      requestBody.redirect_uri = tokenRequest.redirect_uri;
    }

    if (tokenRequest.code_verifier) {
      requestBody.code_verifier = tokenRequest.code_verifier;
    }

    logger.info({
      supabaseTokenUrl,
      supabaseUrl,
      clientId: tokenRequest.client_id,
      hasCodeVerifier: !!tokenRequest.code_verifier,
      hasRedirectUri: !!tokenRequest.redirect_uri,
      codePrefix: tokenRequest.code.substring(0, 8),
    }, 'Proxying token exchange to Supabase OAuth 2.1');

    // Forward request to Supabase
    let response: Response;
    let responseData: any;

    try {
      response = await fetch(supabaseTokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestBody),
      });

      // Try to parse JSON response
      try {
        responseData = await response.json();
      } catch (parseError) {
        // If response is not JSON, read as text
        const textResponse = await response.text();
        logger.error({
          statusCode: response.status,
          statusText: response.statusText,
          responseText: textResponse.substring(0, 500),
        }, 'Supabase token endpoint returned non-JSON response');
        return NextResponse.json(
          {
            error: 'server_error',
            error_description: `Supabase OAuth 2.1 server returned invalid response. Status: ${response.status}. This may indicate OAuth Server is not enabled in Supabase Dashboard → Auth → OAuth Server.`,
          },
          { status: 500 }
        );
      }
    } catch (fetchError) {
      logger.error({
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        errorType: fetchError?.constructor?.name,
        supabaseTokenUrl,
      }, 'Failed to connect to Supabase OAuth 2.1 token endpoint');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: `Cannot reach Supabase OAuth 2.1 server. Please check if OAuth Server is enabled in Supabase Dashboard → Auth → OAuth Server and verify SUPABASE_URL is correct.`,
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      // Distinguish between configuration errors and invalid requests
      const isConfigurationError = response.status === 500 || response.status === 503 ||
        (responseData.error && (
          responseData.error.includes('server') ||
          responseData.error.includes('configuration') ||
          responseData.error_description?.toLowerCase().includes('oauth server')
        ));

      if (isConfigurationError) {
        logger.error({
          statusCode: response.status,
          error: responseData.error,
          errorDescription: responseData.error_description,
          supabaseTokenUrl,
        }, 'Supabase OAuth 2.1 configuration error - OAuth Server may not be enabled');
        return NextResponse.json(
          {
            error: responseData.error || 'server_error',
            error_description: responseData.error_description || 'Supabase OAuth 2.1 server configuration error. Please check if OAuth Server is enabled in Supabase Dashboard → Auth → OAuth Server.',
          },
          { status: response.status }
        );
      }

      logger.warn({
        statusCode: response.status,
        error: responseData.error,
        errorDescription: responseData.error_description,
        codePrefix: tokenRequest.code.substring(0, 8),
        clientId: tokenRequest.client_id,
      }, 'Supabase token exchange failed - invalid request');
      return NextResponse.json(
        {
          error: responseData.error || 'invalid_grant',
          error_description: responseData.error_description || 'Token exchange failed',
        },
        { status: response.status }
      );
    }

    logger.info({
      hasAccessToken: !!responseData.access_token,
      hasRefreshToken: !!responseData.refresh_token,
      expiresIn: responseData.expires_in,
      scope: responseData.scope,
    }, 'Token exchange successful via Supabase');

    // Return Supabase's response (normalized)
    return NextResponse.json({
      access_token: responseData.access_token,
      token_type: responseData.token_type || 'Bearer',
      expires_in: responseData.expires_in,
      refresh_token: responseData.refresh_token,
      scope: responseData.scope,
    });
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
    // Proxy token refresh to Supabase OAuth 2.1 server
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      logger.error({
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      }, 'Missing SUPABASE_URL environment variable');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'OAuth server configuration error: SUPABASE_URL is not set',
        },
        { status: 500 }
      );
    }

    // Validate Supabase URL format
    try {
      new URL(supabaseUrl);
    } catch {
      logger.error({
        supabaseUrl,
      }, 'Invalid SUPABASE_URL format');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Invalid SUPABASE_URL configuration',
        },
        { status: 500 }
      );
    }

    const supabaseTokenUrl = `${supabaseUrl}/auth/v1/oauth/token`;

    // Build request body for Supabase
    const requestBody: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: tokenRequest.refresh_token,
      client_id: tokenRequest.client_id,
    };

    logger.info({
      supabaseTokenUrl,
      supabaseUrl,
      clientId: tokenRequest.client_id,
      refreshTokenPrefix: tokenRequest.refresh_token.substring(0, 8),
    }, 'Proxying token refresh to Supabase OAuth 2.1');

    // Forward request to Supabase
    let response: Response;
    let responseData: any;

    try {
      response = await fetch(supabaseTokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestBody),
      });

      // Try to parse JSON response
      try {
        responseData = await response.json();
      } catch (parseError) {
        // If response is not JSON, read as text
        const textResponse = await response.text();
        logger.error({
          statusCode: response.status,
          statusText: response.statusText,
          responseText: textResponse.substring(0, 500),
        }, 'Supabase token refresh endpoint returned non-JSON response');
        return NextResponse.json(
          {
            error: 'server_error',
            error_description: `Supabase OAuth 2.1 server returned invalid response. Status: ${response.status}. This may indicate OAuth Server is not enabled in Supabase Dashboard → Auth → OAuth Server.`,
          },
          { status: 500 }
        );
      }
    } catch (fetchError) {
      logger.error({
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        errorType: fetchError?.constructor?.name,
        supabaseTokenUrl,
      }, 'Failed to connect to Supabase OAuth 2.1 token endpoint');
      return NextResponse.json(
        {
          error: 'server_error',
          error_description: `Cannot reach Supabase OAuth 2.1 server. Please check if OAuth Server is enabled in Supabase Dashboard → Auth → OAuth Server and verify SUPABASE_URL is correct.`,
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      // Distinguish between configuration errors and invalid requests
      const isConfigurationError = response.status === 500 || response.status === 503 ||
        (responseData.error && (
          responseData.error.includes('server') ||
          responseData.error.includes('configuration') ||
          responseData.error_description?.toLowerCase().includes('oauth server')
        ));

      if (isConfigurationError) {
        logger.error({
          statusCode: response.status,
          error: responseData.error,
          errorDescription: responseData.error_description,
          supabaseTokenUrl,
        }, 'Supabase OAuth 2.1 configuration error - OAuth Server may not be enabled');
        return NextResponse.json(
          {
            error: responseData.error || 'server_error',
            error_description: responseData.error_description || 'Supabase OAuth 2.1 server configuration error. Please check if OAuth Server is enabled in Supabase Dashboard → Auth → OAuth Server.',
          },
          { status: response.status }
        );
      }

      logger.warn({
        statusCode: response.status,
        error: responseData.error,
        errorDescription: responseData.error_description,
        refreshTokenPrefix: tokenRequest.refresh_token.substring(0, 8),
        clientId: tokenRequest.client_id,
      }, 'Supabase token refresh failed - invalid request');
      return NextResponse.json(
        {
          error: responseData.error || 'invalid_grant',
          error_description: responseData.error_description || 'Token refresh failed',
        },
        { status: response.status }
      );
    }

    logger.info({
      hasAccessToken: !!responseData.access_token,
      hasRefreshToken: !!responseData.refresh_token,
      expiresIn: responseData.expires_in,
      scope: responseData.scope,
    }, 'Token refresh successful via Supabase');

    // Return Supabase's response (normalized)
    return NextResponse.json({
      access_token: responseData.access_token,
      token_type: responseData.token_type || 'Bearer',
      expires_in: responseData.expires_in,
      refresh_token: responseData.refresh_token,
      scope: responseData.scope,
    });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Token refresh error');

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'Token refresh failed',
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
