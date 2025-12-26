import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';
import { createServiceRoleClient } from '@projectflow/db';

interface PendingRequest {
    id: string;
    client_id: string;
    code_challenge: string;
    code_challenge_method: string;
    redirect_uri: string;
    state: string | null;
    scope: string | null;
    user_id: string | null;
    authorization_code: string | null;
    created_at: string;
    expires_at: string;
}

/**
 * OAuth 2.1 Authorization Endpoint
 * 
 * Handles the authorization flow using Supabase Auth.
 * If user is logged in, generates an authorization code.
 * If not, redirects to login page.
 */
export async function GET(request: NextRequest) {
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'oauth');

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const state = searchParams.get('state');
    const codeChallenge = searchParams.get('code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method');
    const scope = searchParams.get('scope');

    // Enhanced logging for code challenge
    logger.info({
        clientId,
        redirectUri,
        hasCodeChallenge: !!codeChallenge,
        codeChallengeLength: codeChallenge?.length,
        codeChallengeFull: codeChallenge, // Log full value
        codeChallengeMethod,
        hasState: !!state,
        scope,
    }, 'Authorization request received');

    // #region agent log - H-B
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:GET', message: 'Authorize endpoint received request', data: { clientId, redirectUri, codeChallenge: codeChallenge?.substring(0, 20) + '...', hasState: !!state, scope }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion

    // Validate required parameters
    if (!clientId || !redirectUri || !codeChallenge) {
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Missing required parameters: client_id, redirect_uri, or code_challenge',
            },
            { status: 400 }
        );
    }

    // Check if user is authenticated
    // Use getUser() to verify authentication securely (authenticates with Supabase Auth server)
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        // #region agent log - H-B
        fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:noUser', message: 'User not authenticated, handling request', data: { hasError: !!userError, errorMsg: userError?.message }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion

        // Store pending request in Supabase for later processing
        // Note: This is optional - if database operations fail, we can still proceed
        // The authorization code will be self-contained with all necessary information
        try {
            const serviceRoleClient = createServiceRoleClient();

            // Validate code challenge format before storing
            if (codeChallenge && !/^[A-Za-z0-9_-]+$/.test(codeChallenge)) {
                logger.warn({
                    codeChallenge,
                    codeChallengeProblem: 'Invalid code challenge format - contains invalid characters',
                }, 'Invalid code challenge format received');
                return NextResponse.json(
                    {
                        error: 'invalid_request',
                        error_description: 'Invalid code_challenge format',
                    },
                    { status: 400 }
                );
            }

            // Check if a pending request already exists for this client_id (deduplication)
            const { data: existingPending, error: lookupError } = await serviceRoleClient
                .from('oauth_pending_requests')
                .select('*')
                .eq('client_id', clientId)
                .eq('status', 'pending')
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
                        codeChallengeFull: codeChallenge,
                        fallback: 'self-contained-code',
                    }, 'Database table not found (schema cache issue) - will use self-contained authorization code');
                } else {
                    logger.warn({
                        lookupError: lookupError.message,
                        correlationId,
                        codeChallengeFull: codeChallenge,
                        fallback: 'self-contained-code',
                    }, 'Failed to lookup pending request in Supabase - will use self-contained authorization code');
                }
                // Continue anyway - authorization code will be self-contained with all necessary information
            } else if (existingPending) {
                // Update existing pending request with new challenge (latest wins for deduplication)
                const { error: updateError } = await serviceRoleClient
                    .from('oauth_pending_requests')
                    .update({
                        code_challenge: codeChallenge,
                        code_challenge_method: codeChallengeMethod || 'S256',
                        redirect_uri: redirectUri,
                        state: state || null,
                        scope: scope || null,
                        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                        status: 'pending',
                    })
                    .eq('id', existingPending.id);

                if (updateError) {
                    logger.warn({
                        updateError: updateError.message,
                        correlationId,
                        existingPendingId: existingPending.id,
                        codeChallengeFull: codeChallenge,
                        fallback: 'self-contained-code',
                    }, 'Failed to update existing pending request - will use self-contained authorization code');
                } else {
                    logger.info({
                        clientId,
                        existingPendingId: existingPending.id,
                        oldChallenge: existingPending.code_challenge?.substring(0, 20) + '...',
                        newChallenge: codeChallenge?.substring(0, 20) + '...',
                        codeChallengeLength: codeChallenge?.length,
                        codeChallengeMethod: codeChallengeMethod || 'S256',
                        redirectUri,
                        state: state?.substring(0, 20) + '...',
                        correlationId,
                        timestamp: new Date().toISOString(),
                    }, 'Updated existing pending request with new challenge (deduplication - latest wins)');
                }
            } else {
                // No existing pending request - try to insert new one
                // If unique constraint violation, another request already inserted, so update instead
                const { error: insertError } = await serviceRoleClient
                    .from('oauth_pending_requests')
                    .insert({
                        client_id: clientId,
                        code_challenge: codeChallenge,
                        code_challenge_method: codeChallengeMethod || 'S256',
                        redirect_uri: redirectUri,
                        state: state || null,
                        scope: scope || null,
                        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                        status: 'pending',
                    });

                if (insertError) {
                    // Check if it's a unique constraint violation (concurrent request already inserted)
                    const errorMessage = insertError.message || '';
                    const isUniqueViolation = errorMessage.includes('duplicate key') ||
                        errorMessage.includes('unique constraint') ||
                        errorMessage.includes('already exists') ||
                        errorMessage.includes('violates unique constraint');

                    if (isUniqueViolation) {
                        // Another concurrent request already inserted - update it instead
                        logger.info({
                            clientId,
                            codeChallenge: codeChallenge?.substring(0, 20) + '...',
                            correlationId,
                        }, 'Concurrent request detected (unique constraint violation), updating existing pending request');

                        const { error: updateError } = await serviceRoleClient
                            .from('oauth_pending_requests')
                            .update({
                                code_challenge: codeChallenge, // Latest wins
                                code_challenge_method: codeChallengeMethod || 'S256',
                                redirect_uri: redirectUri,
                                state: state || null,
                                scope: scope || null,
                                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                                status: 'pending',
                            })
                            .eq('client_id', clientId)
                            .eq('status', 'pending');

                        if (updateError) {
                            logger.warn({
                                updateError: updateError.message,
                                correlationId,
                                codeChallengeFull: codeChallenge,
                                fallback: 'self-contained-code',
                            }, 'Failed to update after unique constraint violation - will use self-contained authorization code');
                        } else {
                            logger.info({
                                clientId,
                                codeChallenge: codeChallenge?.substring(0, 20) + '...',
                                correlationId,
                                timestamp: new Date().toISOString(),
                            }, 'Updated existing pending request after unique constraint violation (deduplication - latest wins)');
                        }
                    } else {
                        // Some other error
                        const isTableNotFound = errorMessage.includes('Could not find the table') ||
                            errorMessage.includes('relation') ||
                            errorMessage.includes('does not exist');

                        if (isTableNotFound) {
                            logger.warn({
                                insertError: insertError.message,
                                correlationId,
                                codeChallengeFull: codeChallenge,
                                fallback: 'self-contained-code',
                            }, 'Database table not found (schema cache issue) - will use self-contained authorization code');
                        } else {
                            logger.warn({
                                insertError: insertError.message,
                                correlationId,
                                codeChallengeFull: codeChallenge,
                                fallback: 'self-contained-code',
                            }, 'Failed to store pending request in Supabase - will use self-contained authorization code');
                        }
                    }
                    // Continue anyway - authorization code will be self-contained with all necessary information
                } else {
                    logger.info({
                        clientId,
                        codeChallengeFull: codeChallenge, // Log full challenge for debugging
                        codeChallengeLength: codeChallenge?.length,
                        codeChallengeMethod: codeChallengeMethod || 'S256',
                        redirectUri,
                        state: state?.substring(0, 20) + '...',
                        correlationId,
                        timestamp: new Date().toISOString(),
                    }, 'Stored new pending request in Supabase with full challenge');
                }
            }
        } catch (error) {
            // Handle any exceptions during database operations gracefully
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isTableNotFound = errorMessage.includes('Could not find the table') ||
                errorMessage.includes('relation') ||
                errorMessage.includes('does not exist');

            if (isTableNotFound) {
                logger.warn({
                    error: errorMessage,
                    correlationId,
                    fallback: 'self-contained-code',
                }, 'Database table not found (schema cache issue) - will use self-contained authorization code');
            } else {
                logger.warn({
                    error: errorMessage,
                    correlationId,
                    fallback: 'self-contained-code',
                }, 'Exception storing pending request - will use self-contained authorization code');
            }
            // Continue anyway - authorization code will be self-contained with all necessary information
        }

        // Build OAuth authorize URL with all parameters preserved
        // Use absolute URL to ensure proper redirects
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const oauthAuthorizeUrl = new URL('/api/oauth/authorize', baseUrl);
        if (clientId) oauthAuthorizeUrl.searchParams.set('client_id', clientId);
        if (redirectUri) oauthAuthorizeUrl.searchParams.set('redirect_uri', redirectUri);
        if (state) oauthAuthorizeUrl.searchParams.set('state', state);
        if (codeChallenge) oauthAuthorizeUrl.searchParams.set('code_challenge', codeChallenge);
        if (codeChallengeMethod) oauthAuthorizeUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
        if (scope) oauthAuthorizeUrl.searchParams.set('scope', scope);

        // Detect if this is a browser request or programmatic request (like from Cursor)
        // Check redirect_uri first - cursor:// scheme indicates Cursor MCP client
        const isCursorClient = redirectUri?.startsWith('cursor://');
        const userAgent = request.headers.get('user-agent') || '';
        const isBrowser = !isCursorClient && (userAgent.includes('Mozilla') || userAgent.includes('WebKit') || userAgent.includes('Chrome') || userAgent.includes('Safari'));

        if (isBrowser) {
            // Browser request - redirect to user-friendly OAuth page
            logger.info({ isBrowser: true, userAgent: userAgent.substring(0, 50) }, 'Browser request detected, redirecting to OAuth page');
            return NextResponse.redirect(oauthAuthorizeUrl);
        } else {
            // Programmatic request (like from Cursor) - return error that triggers browser launch
            logger.info({ isBrowser: false, isCursorClient, userAgent: userAgent.substring(0, 50) }, 'Programmatic request detected, returning authorization_pending');

            const authorizationUri = oauthAuthorizeUrl.toString();
            return NextResponse.json(
                {
                    error: 'authorization_pending',
                    error_description: 'User authorization required - open browser to complete authentication',
                    verification_uri: authorizationUri,
                    verification_uri_complete: authorizationUri,
                },
                {
                    status: 401,
                    headers: {
                        'WWW-Authenticate': `Bearer error="invalid_token", error_description="authorization_pending", authorization_uri="${authorizationUri}"`,
                    },
                }
            );
        }
    }

    // User is authenticated - get session tokens (safe after getUser() verification)
    // We need the tokens to encode in the authorization code
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        // #region agent log - H-B
        fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:noSession', message: 'User authenticated but no session tokens available', data: { hasError: !!sessionError, errorMsg: sessionError?.message }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion

        // Build OAuth authorize URL with all parameters preserved
        // Use absolute URL to ensure proper redirects
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const oauthAuthorizeUrl = new URL('/api/oauth/authorize', baseUrl);
        if (clientId) oauthAuthorizeUrl.searchParams.set('client_id', clientId);
        if (redirectUri) oauthAuthorizeUrl.searchParams.set('redirect_uri', redirectUri);
        if (state) oauthAuthorizeUrl.searchParams.set('state', state);
        if (codeChallenge) oauthAuthorizeUrl.searchParams.set('code_challenge', codeChallenge);
        if (codeChallengeMethod) oauthAuthorizeUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
        if (scope) oauthAuthorizeUrl.searchParams.set('scope', scope);

        // Detect if this is a browser request or programmatic request
        // Check redirect_uri first - cursor:// scheme indicates Cursor MCP client
        const isCursorClient = redirectUri?.startsWith('cursor://');
        const userAgent = request.headers.get('user-agent') || '';
        const isBrowser = !isCursorClient && (userAgent.includes('Mozilla') || userAgent.includes('WebKit') || userAgent.includes('Chrome') || userAgent.includes('Safari'));

        if (isBrowser) {
            // Browser request - redirect to user-friendly OAuth page
            return NextResponse.redirect(oauthAuthorizeUrl);
        } else {
            // Programmatic request - return error that triggers browser launch
            const authorizationUri = oauthAuthorizeUrl.toString();
            return NextResponse.json(
                {
                    error: 'authorization_pending',
                    error_description: 'User authorization required - open browser to complete authentication',
                    verification_uri: authorizationUri,
                    verification_uri_complete: authorizationUri,
                },
                {
                    status: 401,
                    headers: {
                        'WWW-Authenticate': `Bearer error="invalid_token", error_description="authorization_pending", authorization_uri="${authorizationUri}"`,
                    },
                }
            );
        }
    }

    // User is authenticated - prepare code data first
    // Validate code challenge format before using it
    if (codeChallenge && !/^[A-Za-z0-9_-]+$/.test(codeChallenge)) {
        logger.warn({
            codeChallenge,
            codeChallengeProblem: 'Invalid code challenge format - contains invalid characters',
        }, 'Invalid code challenge format received');
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Invalid code_challenge format',
            },
            { status: 400 }
        );
    }

    // Prepare default code data (fallback if no pending request found)
    const authCode = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const codeData = {
        userId: user.id,
        codeChallenge,
        codeChallengeMethod: codeChallengeMethod || 'S256',
        scope: scope || '',
        redirectUri: redirectUri, // Store for validation during token exchange
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    // Base64 encode the code data
    const encodedCode = Buffer.from(JSON.stringify(codeData)).toString('base64url');
    let finalCode = `${authCode}.${encodedCode}`; // Use let so it can be reassigned from pending request

    // Log code challenge storage with full details
    logger.info({
        codeChallenge,
        codeChallengeLength: codeChallenge?.length,
        codeChallengeMethod: codeChallengeMethod || 'S256',
        userId: user.id,
        correlationId,
        timestamp: new Date().toISOString(),
    }, 'Prepared default authorization code (will use pending request challenge if found)');

    // Look up THE SINGLE pending request for this client (deduplication)
    // Generate ONE authorization code using that request's challenge
    // Note: This is optional - if database operations fail, we continue with self-contained code
    // The authorization code is self-contained and contains all necessary information
    try {
        const serviceRoleClient = createServiceRoleClient();

        // Find THE SINGLE pending request for this client (deduplication ensures only one exists)
        const { data: pendingRequest, error: lookupError } = await serviceRoleClient
            .from('oauth_pending_requests')
            .select('*')
            .eq('client_id', clientId)
            .eq('status', 'pending')
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
                    fallback: 'self-contained-code',
                }, 'Database table not found (schema cache issue) - using self-contained authorization code');
            } else {
                logger.warn({
                    lookupError: lookupError.message,
                    correlationId,
                    fallback: 'self-contained-code',
                }, 'Failed to lookup pending request from Supabase - using self-contained authorization code');
            }
            // Continue with self-contained code - it contains all necessary information
        } else if (pendingRequest) {
            // Found THE SINGLE pending request - use its challenge for code generation
            const pendingReq = pendingRequest as PendingRequest;
            const pendingChallenge = pendingReq.code_challenge;
            const pendingChallengeMethod = pendingReq.code_challenge_method || 'S256';
            const pendingScope = pendingReq.scope || '';
            const pendingRedirectUri = pendingReq.redirect_uri;
            const pendingState = pendingReq.state;

            logger.info({
                pendingId: pendingReq.id,
                pendingChallenge: pendingChallenge?.substring(0, 20) + '...',
                pendingChallengeLength: pendingChallenge?.length,
                currentRequestChallenge: codeChallenge?.substring(0, 20) + '...',
                challengesMatch: pendingChallenge === codeChallenge,
                clientId,
                correlationId,
            }, 'Found single pending request for client (deduplication), using its challenge for code generation');

            // Generate ONE authorization code using the challenge from the pending request
            // This ensures PKCE verification will succeed for the latest concurrent request
            const pendingAuthCode = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const pendingCodeData = {
                userId: user.id,
                codeChallenge: pendingChallenge, // Use challenge from pending request (latest wins)
                codeChallengeMethod: pendingChallengeMethod,
                scope: pendingScope,
                redirectUri: pendingRedirectUri,
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
                state: pendingState,
            };

            // Base64 encode the code data
            const pendingEncodedCode = Buffer.from(JSON.stringify(pendingCodeData)).toString('base64url');
            const pendingFinalCode = `${pendingAuthCode}.${pendingEncodedCode}`;

            // Update finalCode to use the code generated from pending request
            // This ensures the redirect uses the correct challenge
            finalCode = pendingFinalCode;

            logger.info({
                pendingId: pendingReq.id,
                pendingChallenge: pendingChallenge?.substring(0, 20) + '...',
                pendingChallengeLength: pendingChallenge?.length,
                codeLength: pendingFinalCode.length,
                correlationId,
            }, 'Generated authorization code from pending request challenge');

            // Update pending request with user_id, authorization_code, and status
            const { error: updateError } = await serviceRoleClient
                .from('oauth_pending_requests')
                .update({
                    user_id: user.id,
                    authorization_code: pendingFinalCode, // Store the full encoded code
                    status: 'authorized',
                })
                .eq('id', pendingReq.id);

            if (updateError) {
                // Handle update errors gracefully - code is already self-contained
                const errorMessage = updateError.message || '';
                const isTableNotFound = errorMessage.includes('Could not find the table') ||
                    errorMessage.includes('relation') ||
                    errorMessage.includes('does not exist');

                if (isTableNotFound) {
                    logger.warn({
                        updateError: updateError.message,
                        correlationId,
                        pendingId: pendingReq.id,
                        fallback: 'self-contained-code',
                    }, 'Database table not found (schema cache issue) - authorization code is self-contained');
                } else {
                    logger.warn({
                        updateError: updateError.message,
                        correlationId,
                        pendingId: pendingReq.id,
                        fallback: 'self-contained-code',
                    }, 'Failed to update pending request with code - authorization code is self-contained');
                }
                // Continue - authorization code is self-contained and can be used directly
            } else {
                logger.info({
                    pendingId: pendingReq.id,
                    userId: user.id,
                    codeLength: pendingFinalCode.length,
                    codeChallengeInStoredCode: pendingChallenge,
                    finalCodePreview: pendingFinalCode.substring(0, 50) + '...',
                    status: 'authorized',
                    correlationId,
                    timestamp: new Date().toISOString(),
                }, 'Updated pending request with authorization code and status');
            }
        } else {
            logger.info({
                clientId,
                codeChallenge: codeChallenge?.substring(0, 20) + '...',
                correlationId,
                fallback: 'self-contained-code',
            }, 'No pending request found, using self-contained authorization code');
        }
    } catch (error) {
        // Handle any exceptions during database operations gracefully
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isTableNotFound = errorMessage.includes('Could not find the table') ||
            errorMessage.includes('relation') ||
            errorMessage.includes('does not exist');

        if (isTableNotFound) {
            logger.warn({
                error: errorMessage,
                correlationId,
                fallback: 'self-contained-code',
            }, 'Database table not found (schema cache issue) - authorization code is self-contained');
        } else {
            logger.warn({
                error: errorMessage,
                correlationId,
                fallback: 'self-contained-code',
            }, 'Exception updating pending request - authorization code is self-contained');
        }
        // Continue - authorization code is self-contained and contains all necessary information
    }

    // For cursor:// redirects, use intermediate callback page
    if (redirectUri?.startsWith('cursor://')) {
        // Encode the final URL as a parameter so the callback page can redirect to it
        // Use absolute URL to ensure proper redirects
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const callbackPage = new URL('/oauth/callback', baseUrl);
        callbackPage.searchParams.set('code', finalCode);
        if (state) {
            callbackPage.searchParams.set('state', state);
        }
        callbackPage.searchParams.set('redirectUri', redirectUri);

        logger.info({
            codeLength: finalCode.length,
            codePreview: finalCode.substring(0, 100) + '...',
            codeChallengeInCode: codeChallenge,
            hasState: !!state,
            redirectTarget: 'callback-page',
            correlationId,
        }, 'Redirecting to callback page for cursor:// redirect - code being sent to client');

        return NextResponse.redirect(callbackPage.toString());
    }

    // For regular redirects, redirect back to client with authorization code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', finalCode);
    if (state) {
        redirectUrl.searchParams.set('state', state);
    }

    logger.info({
        codeLength: finalCode.length,
        codePreview: finalCode.substring(0, 100) + '...',
        codeChallengeInCode: codeChallenge,
        redirectUri,
        correlationId,
    }, 'Redirecting to client with authorization code - code being sent to client');

    // #region agent log - H-B, H-D
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:redirect', message: 'Redirecting to client with auth code', data: { redirectTarget: redirectUrl.toString().substring(0, 100) + '...', codeLength: finalCode.length, hasState: !!state }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B-D' }) }).catch(() => { });
    // #endregion

    return NextResponse.redirect(redirectUrl.toString());
}

