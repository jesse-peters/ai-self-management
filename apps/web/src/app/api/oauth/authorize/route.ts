import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';

/**
 * OAuth 2.1 Authorization Endpoint
 * 
 * Handles the authorization flow using Supabase Auth.
 * If user is logged in, generates an authorization code.
 * If not, redirects to login page.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const state = searchParams.get('state');
    const codeChallenge = searchParams.get('code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method');
    const scope = searchParams.get('scope');

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
        fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:noUser', message: 'User not authenticated, redirecting to login', data: { hasError: !!userError, errorMsg: userError?.message }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion

        // User not authenticated - redirect to login page with return URL
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // User is authenticated - get session tokens (safe after getUser() verification)
    // We need the tokens to encode in the authorization code
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        // #region agent log - H-B
        fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:noSession', message: 'User authenticated but no session tokens available', data: { hasError: !!sessionError, errorMsg: sessionError?.message }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion

        // User authenticated but no session - redirect to login
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // User is authenticated - generate authorization code
    // Encode the session tokens in the code itself (no DB needed)
    const authCode = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Store the code challenge, user info, and tokens in the code
    const codeData = {
        userId: user.id,
        codeChallenge,
        codeChallengeMethod: codeChallengeMethod || 'S256',
        scope: scope || '',
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    // Base64 encode the code data
    const encodedCode = Buffer.from(JSON.stringify(codeData)).toString('base64url');
    const finalCode = `${authCode}.${encodedCode}`;

    // Redirect back to client with authorization code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', finalCode);
    if (state) {
        redirectUrl.searchParams.set('state', state);
    }

    // #region agent log - H-B, H-D
    fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/authorize/route.ts:redirect', message: 'Redirecting to client with auth code', data: { redirectTarget: redirectUrl.toString().substring(0, 100) + '...', codeLength: finalCode.length, hasState: !!state }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'B-D' }) }).catch(() => { });
    // #endregion

    return NextResponse.redirect(redirectUrl.toString());
}

