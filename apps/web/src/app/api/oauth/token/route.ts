import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createHash } from 'crypto';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';
import { createServiceRoleClient } from '@projectflow/db';

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
            result = await handleAuthorizationCodeGrant(body, logger, correlationId);
        } else if (grantType === 'refresh_token') {
            result = await handleRefreshTokenGrant(body, logger, correlationId);
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
    logger: ReturnType<typeof createRequestLogger>,
    correlationId: string
): Promise<NextResponse> {
    let { code, redirect_uri, code_verifier, state } = body;

    logger.info({
        hasCode: !!code,
        hasRedirectUri: !!redirect_uri,
        hasCodeVerifier: !!code_verifier,
        hasState: !!state,
        codeLength: code?.length,
        codePreview: code?.substring(0, 100) + '...', // Log first 100 chars of code from request
        codeVerifierLength: code_verifier?.length,
        codeVerifierPreview: code_verifier?.substring(0, 20) + '...',
        correlationId,
    }, 'Processing authorization code grant - code received from client');

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

    // Validate code verifier format (RFC 7636)
    if (!/^[A-Za-z0-9._~\-]+$/.test(code_verifier)) {
        logger.warn({
            codeVerifierLength: code_verifier.length,
            codeVerifierPreview: code_verifier.substring(0, 30),
            problem: 'Invalid code verifier format - contains invalid characters',
        }, 'Invalid code verifier format received');
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Invalid code_verifier format',
            },
            { status: 400 }
        );
    }

    try {
        // Verify code verifier format (RFC 7636)
        if (!/^[A-Za-z0-9._~\-]+$/.test(code_verifier)) {
            logger.warn({
                codeVerifierLength: code_verifier.length,
                codeVerifierPreview: code_verifier.substring(0, 30),
                problem: 'Invalid code verifier format - contains invalid characters',
            }, 'Invalid code verifier format received');
            return NextResponse.json(
                {
                    error: 'invalid_request',
                    error_description: 'Invalid code_verifier format',
                },
                { status: 400 }
            );
        }

        // First compute the code challenge from the verifier to check for pending requests
        // This will be reused for PKCE verification later
        const computedChallengeForLookup = createHash('sha256').update(code_verifier).digest('base64url');

        logger.info({
            codeVerifierLength: code_verifier.length,
            codeVerifierPreview: code_verifier.substring(0, 20) + '...',
            computedChallengeLength: computedChallengeForLookup.length,
            computedChallengeFull: computedChallengeForLookup,
            correlationId,
        }, 'Looking up pending request in Supabase');

        // Look up pending request by computed challenge
        // Note: This lookup is optional - the authorization code is self-contained
        // and contains all necessary information. Database lookup is only for
        // handling concurrent requests. If lookup fails, we continue with self-contained verification.
        try {
            const serviceRoleClient = createServiceRoleClient();
            const { data: pending, error: lookupError } = await serviceRoleClient
                .from('oauth_pending_requests')
                .select('*')
                .eq('code_challenge', computedChallengeForLookup)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (lookupError) {
                // Handle specific database errors gracefully
                const errorMessage = lookupError.message || '';
                const isTableNotFound = errorMessage.includes('Could not find the table') ||
                    errorMessage.includes('relation') ||
                    errorMessage.includes('does not exist');

                if (isTableNotFound) {
                    logger.warn({
                        lookupError: lookupError.message,
                        correlationId,
                        fallback: 'self-contained-code-verification',
                    }, 'Database table not found (schema cache issue) - continuing with self-contained code verification');
                } else {
                    logger.warn({
                        lookupError: lookupError.message,
                        correlationId,
                        fallback: 'self-contained-code-verification',
                    }, 'Failed to lookup pending request from Supabase - continuing with self-contained code verification');
                }
                // Continue with self-contained code verification - code contains all necessary data
            } else if (pending && pending.authorization_code) {
                const codeFromRequest = code; // Save original code from request
                const codeFromDB = pending.authorization_code;
                const codesMatch = codeFromRequest === codeFromDB;

                logger.info({
                    pendingId: pending.id,
                    hasPendingCode: !!pending.authorization_code,
                    clientId: pending.client_id,
                    storedChallenge: (pending as any).code_challenge,
                    storedChallengeLength: (pending as any).code_challenge?.length,
                    computedChallengeForLookup: computedChallengeForLookup,
                    computedChallengeLength: computedChallengeForLookup.length,
                    challengesMatch: (pending as any).code_challenge === computedChallengeForLookup,
                    codeFromRequestLength: codeFromRequest?.length,
                    codeFromRequestPreview: codeFromRequest?.substring(0, 100) + '...',
                    codeFromDBLength: codeFromDB?.length,
                    codeFromDBPreview: codeFromDB?.substring(0, 100) + '...',
                    codesMatch,
                    correlationId,
                }, 'Found pending request with authorization code in Supabase - comparing codes');

                // Use the authorization code from pending request
                code = pending.authorization_code;

                logger.info({
                    usingCodeFrom: codesMatch ? 'request (matches DB)' : 'database (replacing request code)',
                    finalCodeLength: code.length,
                    finalCodePreview: code.substring(0, 100) + '...',
                    correlationId,
                }, 'Using authorization code for processing');

                // Delete the pending request (single-use enforcement)
                const { error: deleteError } = await serviceRoleClient
                    .from('oauth_pending_requests')
                    .delete()
                    .eq('id', pending.id);

                if (deleteError) {
                    logger.warn({
                        deleteError: deleteError.message,
                        correlationId,
                    }, 'Failed to delete pending request after code creation');
                } else {
                    logger.info({
                        pendingId: pending.id,
                        correlationId,
                    }, 'Deleted pending request after code creation (single-use enforcement)');
                }
            } else if (pending && !pending.authorization_code) {
                logger.info({
                    pendingId: pending.id,
                    correlationId,
                }, 'Found pending request but no authorization code yet - user may not have authenticated');
            } else {
                logger.info({
                    computedChallengeFull: computedChallengeForLookup,
                    computedChallengePreview: computedChallengeForLookup.substring(0, 20) + '...',
                    correlationId,
                    fallback: 'self-contained-code-verification',
                }, 'No pending request found for this code challenge - using self-contained code verification');
            }
        } catch (error) {
            // Handle any exceptions during database lookup gracefully
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isTableNotFound = errorMessage.includes('Could not find the table') ||
                errorMessage.includes('relation') ||
                errorMessage.includes('does not exist');

            if (isTableNotFound) {
                logger.warn({
                    error: errorMessage,
                    correlationId,
                    fallback: 'self-contained-code-verification',
                }, 'Database table not found (schema cache issue) - continuing with self-contained code verification');
            } else {
                logger.warn({
                    error: errorMessage,
                    correlationId,
                    fallback: 'self-contained-code-verification',
                }, 'Exception looking up pending request - continuing with self-contained code verification');
            }
            // Continue with self-contained code verification - authorization code contains all necessary information
        }

        // Continue with self-contained code verification
        // The authorization code is self-contained and includes:
        // - codeChallenge (for PKCE verification)
        // - accessToken and refreshToken (to return to client)
        // - redirectUri (for validation)
        // - expiresAt (for expiration check)
        // - userId and other metadata
        // Database lookup was optional - we can verify everything from the code itself

        // Handle URL-encoded authorization code (comes through redirect URIs)
        // The code might be URL-encoded, so decode it first
        let decodedCode = code;
        let wasUrlEncoded = false;
        try {
            const decodedAttempt = decodeURIComponent(code);
            // Only use decoded if it's different (was encoded)
            if (decodedAttempt !== code) {
                wasUrlEncoded = true;
                decodedCode = decodedAttempt;
            }
        } catch {
            // If decoding fails, use original code (might not be encoded)
            decodedCode = code;
        }

        logger.debug({
            codeLength: code.length,
            decodedCodeLength: decodedCode.length,
            wasUrlEncoded,
            codePreview: code.substring(0, 50) + '...',
        }, 'Processing authorization code');

        // Decode the authorization code
        const codeParts = decodedCode.split('.');
        if (codeParts.length < 2) {
            logger.warn({
                codeLength: decodedCode.length,
                parts: codeParts.length,
                wasUrlEncoded,
                decodedCodePreview: decodedCode.substring(0, 50),
            }, 'Invalid authorization code format - missing parts');
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
            logger.warn({
                wasUrlEncoded,
                decodedCodePreview: decodedCode.substring(0, 50),
            }, 'Missing encoded data in authorization code');
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
            logger.info({
                userId: codeData.userId,
                codeChallengeInCode: codeData.codeChallenge,
                codeChallengeInCodeLength: codeData.codeChallenge?.length,
                codeChallengeMethod: codeData.codeChallengeMethod,
                hasTokens: !!(codeData.accessToken && codeData.refreshToken),
                hasRedirectUri: !!codeData.redirectUri,
                hasState: !!codeData.state,
                expiresAt: codeData.expiresAt,
                correlationId,
            }, 'Decoded authorization code data - extracted challenge from code');
        } catch (decodeError) {
            logger.warn({ error: decodeError, encodedDataLength: encodedData.length, correlationId }, 'Failed to decode authorization code data');
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

        // Validate state parameter (CSRF protection)
        if (state && codeData.state) {
            if (state !== codeData.state) {
                logger.warn({
                    providedState: state?.substring(0, 20),
                    storedState: codeData.state?.substring(0, 20),
                }, 'State parameter mismatch');
                return NextResponse.json(
                    {
                        error: 'invalid_grant',
                        error_description: 'State parameter does not match',
                    },
                    { status: 400 }
                );
            }
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
        logger.info({
            hasCodeChallenge: !!codeData.codeChallenge,
            codeChallengeLength: codeData.codeChallenge?.length,
            codeVerifierLength: code_verifier.length,
            codeChallengeMethod: codeData.codeChallengeMethod || 'S256',
            correlationId,
            timestamp: new Date().toISOString(),
        }, 'Starting PKCE verification');

        const codeChallengeMethod = codeData.codeChallengeMethod || 'S256';
        let computedChallenge: string;

        if (codeChallengeMethod === 'S256') {
            computedChallenge = createHash('sha256').update(code_verifier).digest('base64url');
        } else {
            computedChallenge = code_verifier;
        }

        // Enhanced logging for PKCE debugging - use info level so it shows in production
        logger.info({
            method: codeChallengeMethod,
            codeVerifierLength: code_verifier.length,
            codeVerifierPreview: code_verifier.substring(0, 20) + '...',
            storedChallengeInCode: codeData.codeChallenge, // Challenge stored in the code
            storedChallengeLength: codeData.codeChallenge?.length,
            computedChallengeFromVerifier: computedChallenge, // Challenge computed from verifier
            computedChallengeLength: computedChallenge.length,
            computedChallengeForLookup: computedChallengeForLookup, // Challenge used for DB lookup
            lookupChallengeMatchesCodeChallenge: computedChallengeForLookup === codeData.codeChallenge,
            computedChallengeMatchesCodeChallenge: computedChallenge === codeData.codeChallenge,
            challengesMatch: computedChallenge === codeData.codeChallenge,
            correlationId,
            userId: codeData.userId,
            timestamp: new Date().toISOString(),
        }, 'Verifying PKCE code challenge - comparing computed vs stored');

        if (computedChallenge !== codeData.codeChallenge) {
            // Find where they differ
            const stored = codeData.codeChallenge || '';
            const computed = computedChallenge;
            let diffIndex = -1;
            for (let i = 0; i < Math.max(stored.length, computed.length); i++) {
                if (stored[i] !== computed[i]) {
                    diffIndex = i;
                    break;
                }
            }

            logger.warn({
                method: codeChallengeMethod,
                storedLength: stored.length,
                computedLength: computed.length,
                diffIndex,
                storedAtDiff: diffIndex >= 0 ? stored.substring(Math.max(0, diffIndex - 5), diffIndex + 10) : null,
                computedAtDiff: diffIndex >= 0 ? computed.substring(Math.max(0, diffIndex - 5), diffIndex + 10) : null,
                storedChallenge: stored,
                computedChallenge: computed,
                codeVerifier: code_verifier, // Log the verifier for debugging
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
    logger: ReturnType<typeof createRequestLogger>,
    correlationId: string
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

