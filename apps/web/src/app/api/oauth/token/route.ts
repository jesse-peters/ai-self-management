import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createHash } from 'crypto';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

/**
 * OAuth 2.1 Token Endpoint
 * 
 * Exchanges authorization codes for access tokens (Supabase JWTs).
 * Also handles refresh token grants.
 */
export async function POST(request: NextRequest) {
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'oauth');
    const startTime = Date.now();

    try {
        logger.debug('Token endpoint request received');

        // Parse request body based on Content-Type
        // OAuth 2.0 token requests typically use application/x-www-form-urlencoded
        const rawText = await request.text();
        const contentType = request.headers.get('content-type') || '';

        let body: Record<string, string> = {};
        if (rawText && rawText.trim().length > 0) {
            try {
                if (contentType.includes('application/x-www-form-urlencoded')) {
                    // Parse form-encoded data
                    const params = new URLSearchParams(rawText);
                    body = Object.fromEntries(params.entries());
                } else if (contentType.includes('application/json')) {
                    // Parse JSON (for backward compatibility)
                    body = JSON.parse(rawText);
                } else {
                    // Default to form-encoded (OAuth 2.0 standard)
                    const params = new URLSearchParams(rawText);
                    body = Object.fromEntries(params.entries());
                }
            } catch (parseError) {
                logger.warn({ error: parseError, contentType, bodyLength: rawText.length }, 'Failed to parse request body');
                return NextResponse.json(
                    {
                        error: 'invalid_request',
                        error_description: 'Malformed request body',
                    },
                    { status: 400 }
                );
            }
        }

        logger.debug({
            bodyKeys: Object.keys(body),
            grantType: body.grant_type,
            hasCode: !!body.code,
            hasRedirectUri: !!body.redirect_uri,
            hasVerifier: !!body.code_verifier,
        }, 'Parsed request body');

        const grantType = body.grant_type;

        if (!grantType) {
            logger.warn('Missing grant_type parameter');
            return NextResponse.json(
                {
                    error: 'invalid_request',
                    error_description: 'Missing grant_type parameter',
                },
                { status: 400 }
            );
        }

        logger.debug({ grantType }, 'Processing grant type');

        let result: NextResponse;
        if (grantType === 'authorization_code') {
            result = await handleAuthorizationCodeGrant(body, logger);
        } else if (grantType === 'refresh_token') {
            result = await handleRefreshTokenGrant(body, logger);
        } else {
            logger.warn({ grantType }, 'Unsupported grant type');
            result = NextResponse.json(
                {
                    error: 'unsupported_grant_type',
                    error_description: `Grant type '${grantType}' is not supported`,
                },
                { status: 400 }
            );
        }

        const duration = Date.now() - startTime;
        logger.info({
            grantType,
            status: result.status,
            duration,
        }, 'Token endpoint response');

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error({ error, duration }, 'OAuth token error');
        return NextResponse.json(
            {
                error: 'server_error',
                error_description: process.env.NODE_ENV === 'development'
                    ? (error instanceof Error ? error.message : 'Internal server error')
                    : 'Internal server error',
            },
            { status: 500 }
        );
    }
}

async function handleAuthorizationCodeGrant(
    body: Record<string, string>,
    logger: ReturnType<typeof createRequestLogger>
): Promise<NextResponse> {
    const { code, redirect_uri, code_verifier } = body;

    // Validate required parameters with specific error messages
    if (!code) {
        logger.warn('Missing code parameter');
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Missing required parameter: code',
            },
            { status: 400 }
        );
    }

    if (!redirect_uri) {
        logger.warn('Missing redirect_uri parameter');
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Missing required parameter: redirect_uri',
            },
            { status: 400 }
        );
    }

    if (!code_verifier) {
        logger.warn('Missing code_verifier parameter');
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Missing required parameter: code_verifier',
            },
            { status: 400 }
        );
    }

    try {
        // Handle URL-encoded authorization code (comes through redirect URIs)
        // The code might be URL-encoded, so decode it first
        let decodedCode = code;
        try {
            decodedCode = decodeURIComponent(code);
        } catch {
            // If decoding fails, use original code (might not be encoded)
            decodedCode = code;
        }

        logger.debug({
            codeLength: code.length,
            decodedCodeLength: decodedCode.length,
            codePreview: code.substring(0, 50) + '...',
        }, 'Processing authorization code');

        // Decode the authorization code
        const codeParts = decodedCode.split('.');
        if (codeParts.length < 2) {
            logger.warn({ codeLength: decodedCode.length, parts: codeParts.length }, 'Invalid authorization code format - missing parts');
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Invalid authorization code format',
                },
                { status: 400 }
            );
        }

        const [authCode, encodedData] = codeParts;
        if (!encodedData) {
            logger.warn('Missing encoded data in authorization code');
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Invalid authorization code format',
                },
                { status: 400 }
            );
        }

        // Decode base64url encoded data
        let codeData: any;
        try {
            const decodedData = Buffer.from(encodedData, 'base64url').toString();
            codeData = JSON.parse(decodedData);
            logger.debug({ userId: codeData.userId, hasTokens: !!(codeData.accessToken && codeData.refreshToken) }, 'Decoded authorization code data');
        } catch (decodeError) {
            logger.warn({ error: decodeError, encodedDataLength: encodedData.length }, 'Failed to decode authorization code data');
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Invalid authorization code format',
                },
                { status: 400 }
            );
        }

        // Validate code data structure
        if (!codeData || typeof codeData !== 'object') {
            logger.warn('Invalid code data structure');
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Invalid authorization code data',
                },
                { status: 400 }
            );
        }

        // Check if code is expired
        if (!codeData.expiresAt || Date.now() > codeData.expiresAt) {
            const expiredBy = codeData.expiresAt ? Date.now() - codeData.expiresAt : 'unknown';
            logger.warn({ expiredBy, expiresAt: codeData.expiresAt }, 'Authorization code expired');
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Authorization code has expired',
                },
                { status: 400 }
            );
        }

        // Validate redirect_uri matches the one used during authorization
        if (codeData.redirectUri) {
            // Normalize URIs for comparison (remove trailing slashes, handle case)
            const normalizeUri = (uri: string) => uri.trim().replace(/\/$/, '').toLowerCase();
            const storedUri = normalizeUri(codeData.redirectUri);
            const providedUri = normalizeUri(redirect_uri);

            if (storedUri !== providedUri) {
                logger.warn({
                    storedUri: codeData.redirectUri,
                    providedUri: redirect_uri,
                    storedNormalized: storedUri,
                    providedNormalized: providedUri,
                }, 'Redirect URI mismatch');
                return NextResponse.json(
                    {
                        error: 'invalid_grant',
                        error_description: 'redirect_uri does not match the one used in authorization',
                    },
                    { status: 400 }
                );
            }
        }

        // Verify code challenge (PKCE)
        const codeChallengeMethod = codeData.codeChallengeMethod || 'S256';
        let computedChallenge: string;

        if (codeChallengeMethod === 'S256') {
            computedChallenge = createHash('sha256').update(code_verifier).digest('base64url');
        } else {
            computedChallenge = code_verifier;
        }

        logger.debug({
            method: codeChallengeMethod,
            storedChallenge: codeData.codeChallenge?.substring(0, 20) + '...',
            computedChallenge: computedChallenge.substring(0, 20) + '...',
        }, 'Verifying PKCE code challenge');

        if (computedChallenge !== codeData.codeChallenge) {
            logger.warn({
                method: codeChallengeMethod,
                storedLength: codeData.codeChallenge?.length,
                computedLength: computedChallenge.length,
            }, 'PKCE code challenge verification failed');
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Code verifier does not match code challenge',
                },
                { status: 400 }
            );
        }

        logger.debug('PKCE verification successful');

        // The code contains the actual session access token from when user authorized
        // We'll return this token directly
        if (!codeData.accessToken || !codeData.refreshToken) {
            logger.warn({
                hasAccessToken: !!codeData.accessToken,
                hasRefreshToken: !!codeData.refreshToken,
            }, 'Missing tokens in code data');
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Invalid code data: missing tokens',
                },
                { status: 400 }
            );
        }

        logger.info({ userId: codeData.userId }, 'Authorization code grant successful');

        // Return the Supabase JWT tokens
        return NextResponse.json({
            access_token: codeData.accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: codeData.refreshToken,
            scope: codeData.scope || '',
        });
    } catch (error) {
        logger.error({ error, codeLength: code?.length }, 'Error handling authorization code grant');
        return NextResponse.json(
            {
                error: 'invalid_grant',
                error_description: process.env.NODE_ENV === 'development'
                    ? (error instanceof Error ? error.message : 'Invalid authorization code')
                    : 'Invalid authorization code',
            },
            { status: 400 }
        );
    }
}

async function handleRefreshTokenGrant(
    body: Record<string, string>,
    logger: ReturnType<typeof createRequestLogger>
): Promise<NextResponse> {
    const { refresh_token } = body;

    if (!refresh_token) {
        logger.warn('Missing refresh_token parameter');
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Missing refresh_token parameter',
            },
            { status: 400 }
        );
    }

    try {
        logger.debug('Refreshing token with Supabase');
        // Use Supabase to refresh the token
        const supabase = await createServerClient();
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token,
        });

        if (error || !data.session) {
            logger.warn({ error: error?.message }, 'Failed to refresh token');
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: error?.message || 'Invalid refresh token',
                },
                { status: 400 }
            );
        }

        logger.info('Token refresh successful');
        // Return new tokens
        return NextResponse.json({
            access_token: data.session.access_token,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: data.session.refresh_token,
        });
    } catch (error) {
        logger.error({ error }, 'Error refreshing token');
        return NextResponse.json(
            {
                error: 'server_error',
                error_description: process.env.NODE_ENV === 'development'
                    ? (error instanceof Error ? error.message : 'Failed to refresh token')
                    : 'Failed to refresh token',
            },
            { status: 500 }
        );
    }
}

