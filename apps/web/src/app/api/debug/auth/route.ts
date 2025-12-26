import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@projectflow/core';
import * as jose from 'jose';

/**
 * Debug endpoint for testing token verification
 * GET /api/debug/auth?token=<jwt>
 * 
 * Returns detailed information about token verification
 */
export async function GET(request: NextRequest) {
    const token = request.nextSearchParams.get('token');

    if (!token) {
        return NextResponse.json({
            error: 'Missing token parameter',
            usage: 'GET /api/debug/auth?token=<jwt>',
            example: 'Get a token from /api/mcp/token and paste it as the token query parameter',
        }, { status: 400 });
    }

    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const audience = `${appUrl}/api/mcp`;

        // Decode header and payload without verification
        const header = jose.decodeProtectedHeader(token);
        const decoded = jose.decodeJwt(token);

        // Try to verify
        let verificationStatus = 'unknown';
        let verificationError: string | null = null;
        let claims: any = null;

        try {
            claims = await verifyAccessToken(token, audience);
            verificationStatus = 'success';
        } catch (error) {
            verificationStatus = 'failed';
            verificationError = error instanceof Error ? error.message : String(error);
        }

        // Check expiration
        const expiresAt = decoded.exp ? (decoded.exp as number) * 1000 : null;
        const isExpired = expiresAt ? Date.now() > expiresAt : false;

        return NextResponse.json({
            token_preview: `${token.substring(0, 30)}...${token.substring(token.length - 30)}`,
            token_length: token.length,
            header: {
                algorithm: header.alg,
                type: header.typ,
            },
            decoded_payload: {
                sub: decoded.sub,
                role: decoded.role,
                aud: decoded.aud,
                email: decoded.email,
                exp: expiresAt ? new Date(expiresAt).toISOString() : null,
                iat: decoded.iat ? new Date((decoded.iat as number) * 1000).toISOString() : null,
                all_claims: Object.keys(decoded),
            },
            verification: {
                status: verificationStatus,
                error: verificationError,
                audience: audience,
                verified_claims: claims ? {
                    userId: claims.sub,
                    role: claims.role,
                    audience: claims.aud,
                    email: claims.email,
                    expiresAt: new Date(claims.exp * 1000).toISOString(),
                } : null,
            },
            expiration_check: {
                isExpired,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                now: new Date().toISOString(),
            },
            environment: {
                nodeEnv: process.env.NODE_ENV,
                appUrl,
                audience,
            },
            debug_tips: [
                'Token algorithm: ' + header.alg,
                isExpired ? 'WARNING: Token has expired!' : 'Token is not expired',
                verificationStatus === 'failed' ? `Verification failed: ${verificationError}` : 'Token verification successful',
                header.alg === 'ES256' && process.env.NODE_ENV === 'development' ? 'ES256 in dev mode: claims extracted without signature verification' : '',
            ].filter(Boolean),
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
            error: 'Failed to debug token',
            message: errorMessage,
            token_preview: token.substring(0, 30),
        }, { status: 500 });
    }
}

