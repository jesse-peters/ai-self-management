import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createHash } from 'crypto';

/**
 * OAuth 2.1 Token Endpoint
 * 
 * Exchanges authorization codes for access tokens (Supabase JWTs).
 * Also handles refresh token grants.
 */
export async function POST(request: NextRequest) {
    try {
        // #region agent log - H-A raw body check
        const rawText = await request.text();
        fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/token/route.ts:rawBody', message: 'Raw POST body received', data: { bodyLength: rawText.length, bodyPreview: rawText.substring(0, 200), isEmpty: rawText.trim().length === 0 }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion

        // Parse request body based on Content-Type
        // OAuth 2.0 token requests typically use application/x-www-form-urlencoded
        let body: Record<string, string> = {};
        if (rawText) {
            const contentType = request.headers.get('content-type') || '';
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
        }

        // #region agent log - H-A, H-C
        fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth/token/route.ts:POST', message: 'Token endpoint received request', data: { bodyKeys: Object.keys(body), grantType: body.grant_type, hasCode: !!body.code, redirectUri: body.redirect_uri, hasVerifier: !!body.code_verifier }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'A-C' }) }).catch(() => { });
        // #endregion

        const grantType = body.grant_type;

        if (!grantType) {
            return NextResponse.json(
                {
                    error: 'invalid_request',
                    error_description: 'Missing grant_type parameter',
                },
                { status: 400 }
            );
        }

        if (grantType === 'authorization_code') {
            return handleAuthorizationCodeGrant(body);
        } else if (grantType === 'refresh_token') {
            return handleRefreshTokenGrant(body);
        } else {
            return NextResponse.json(
                {
                    error: 'unsupported_grant_type',
                    error_description: `Grant type '${grantType}' is not supported`,
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('OAuth token error:', error);
        return NextResponse.json(
            {
                error: 'server_error',
                error_description: 'Internal server error',
            },
            { status: 500 }
        );
    }
}

async function handleAuthorizationCodeGrant(body: any) {
    const { code, redirect_uri, code_verifier } = body;

    if (!code || !redirect_uri || !code_verifier) {
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Missing required parameters: code, redirect_uri, or code_verifier',
            },
            { status: 400 }
        );
    }

    try {
        // Decode the authorization code
        const [authCode, encodedData] = code.split('.');
        if (!encodedData) {
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Invalid authorization code format',
                },
                { status: 400 }
            );
        }

        const codeData = JSON.parse(Buffer.from(encodedData, 'base64url').toString());

        // Check if code is expired
        if (Date.now() > codeData.expiresAt) {
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Authorization code has expired',
                },
                { status: 400 }
            );
        }

        // Verify code challenge
        const computedChallenge =
            codeData.codeChallengeMethod === 'S256'
                ? createHash('sha256').update(code_verifier).digest('base64url')
                : code_verifier;

        if (computedChallenge !== codeData.codeChallenge) {
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Code verifier does not match code challenge',
                },
                { status: 400 }
            );
        }

        // The code contains the actual session access token from when user authorized
        // We'll return this token directly
        if (!codeData.accessToken || !codeData.refreshToken) {
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Invalid code data',
                },
                { status: 400 }
            );
        }

        // Return the Supabase JWT tokens
        return NextResponse.json({
            access_token: codeData.accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: codeData.refreshToken,
            scope: codeData.scope,
        });
    } catch (error) {
        console.error('Error handling authorization code grant:', error);
        return NextResponse.json(
            {
                error: 'invalid_grant',
                error_description: 'Invalid authorization code',
            },
            { status: 400 }
        );
    }
}

async function handleRefreshTokenGrant(body: any) {
    const { refresh_token } = body;

    if (!refresh_token) {
        return NextResponse.json(
            {
                error: 'invalid_request',
                error_description: 'Missing refresh_token parameter',
            },
            { status: 400 }
        );
    }

    try {
        // Use Supabase to refresh the token
        const supabase = await createServerClient();
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token,
        });

        if (error || !data.session) {
            return NextResponse.json(
                {
                    error: 'invalid_grant',
                    error_description: 'Invalid refresh token',
                },
                { status: 400 }
            );
        }

        // Return new tokens
        return NextResponse.json({
            access_token: data.session.access_token,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: data.session.refresh_token,
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        return NextResponse.json(
            {
                error: 'server_error',
                error_description: 'Failed to refresh token',
            },
            { status: 500 }
        );
    }
}

