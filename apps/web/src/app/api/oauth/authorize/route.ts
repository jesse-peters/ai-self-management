import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';
import { createServiceRoleClient } from '@projectflow/db';

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

            // Insert pending request
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
                });

            if (insertError) {
                logger.warn({
                    insertError: insertError.message,
                    correlationId,
                    codeChallengeFull: codeChallenge,
                }, 'Failed to store pending request in Supabase');
                // Continue anyway - we can still proceed without persistence
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
                }, 'Stored pending request in Supabase with full challenge');
            }
        } catch (error) {
            logger.warn({
                error: error instanceof Error ? error.message : 'Unknown error',
                correlationId,
            }, 'Exception storing pending request');
            // Continue anyway
        }

        // Build OAuth authorize URL with all parameters preserved
        const oauthAuthorizeUrl = new URL('/oauth/authorize', request.url);
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
        const oauthAuthorizeUrl = new URL('/oauth/authorize', request.url);
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

    // Prepare code data that will be used for all code paths
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
    const finalCode = `${authCode}.${encodedCode}`;

    // Log code challenge storage with full details
    logger.info({
        codeChallenge,
        codeChallengeLength: codeChallenge?.length,
        codeChallengeMethod: codeChallengeMethod || 'S256',
        userId: user.id,
        correlationId,
        timestamp: new Date().toISOString(),
    }, 'Storing code challenge in authorization code');

    // Check if there's a pending request for this client+challenge to update
    try {
        const serviceRoleClient = createServiceRoleClient();

        // Look up pending request
        const { data: pending, error: lookupError } = await serviceRoleClient
            .from('oauth_pending_requests')
            .select('*')
            .eq('client_id', clientId)
            .eq('code_challenge', codeChallenge)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (lookupError) {
            logger.warn({
                lookupError: lookupError.message,
                correlationId,
            }, 'Failed to lookup pending request from Supabase');
        } else if (pending) {
            // Found pending request - store the full encoded code
            logger.info({
                pendingId: pending.id,
                clientId,
                storedChallenge: (pending as any).code_challenge,
                storedChallengeLength: (pending as any).code_challenge?.length,
                codeChallengeInCode: codeChallenge, // The challenge we're encoding in the code
                challengesMatch: (pending as any).code_challenge === codeChallenge,
                correlationId,
            }, 'Found pending request in Supabase, storing full authorization code');

            // Log code details before storing
            const codePreview = finalCode.substring(0, 100) + '...';

            logger.info({
                pendingId: pending.id,
                codeDataChallenge: codeData.codeChallenge,
                codeDataChallengeLength: codeData.codeChallenge?.length,
                finalCodeLength: finalCode.length,
                finalCodePreview: codePreview,
                authCodePart: authCode,
                encodedDataLength: encodedCode.length,
                correlationId,
            }, 'Code details before storing in database');

            // Update pending request with user_id and full authorization_code
            const { error: updateError } = await serviceRoleClient
                .from('oauth_pending_requests')
                .update({
                    user_id: user.id,
                    authorization_code: finalCode, // Store the full encoded code
                })
                .eq('id', pending.id);

            if (updateError) {
                logger.warn({
                    updateError: updateError.message,
                    correlationId,
                    pendingId: pending.id,
                }, 'Failed to update pending request with code');
            } else {
                logger.info({
                    pendingId: pending.id,
                    userId: user.id,
                    codeLength: finalCode.length,
                    codeChallengeInStoredCode: codeChallenge, // The challenge that should be in the code
                    storedChallengeInPending: (pending as any).code_challenge, // The challenge stored in pending request
                    finalCodePreview: finalCode.substring(0, 150) + '...',
                    correlationId,
                    timestamp: new Date().toISOString(),
                }, 'Updated pending request with full authorization code - code contains challenge');
            }
        } else {
            logger.info({
                clientId,
                codeChallenge: codeChallenge?.substring(0, 20) + '...',
                correlationId,
            }, 'No pending request found, using direct code');
        }
    } catch (error) {
        logger.warn({
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId,
        }, 'Exception updating pending request');
    }

    // For cursor:// redirects, use intermediate callback page
    if (redirectUri?.startsWith('cursor://')) {
        // Encode the final URL as a parameter so the callback page can redirect to it
        const callbackPage = new URL('/oauth/callback', request.url);
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

