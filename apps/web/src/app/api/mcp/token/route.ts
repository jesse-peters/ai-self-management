import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// Fixed test user ID for development (must exist in auth.users)
// Run: tsx scripts/create-test-user.ts to create this user
const DEV_TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

/**
 * Development-only token generation endpoint
 * 
 * THIS IS INSECURE AND SHOULD ONLY BE USED IN DEVELOPMENT
 * In production, OAuth must be used instead.
 * 
 * This endpoint generates a properly signed JWT that can be used with the MCP server locally.
 */
export async function GET(request: NextRequest) {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            {
                error: 'forbidden',
                error_description: 'Token generation is only available in development mode',
            },
            { status: 403 }
        );
    }

    // Get required environment variables
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!jwtSecret) {
        return NextResponse.json(
            {
                error: 'server_error',
                error_description: 'JWT secret not configured',
            },
            { status: 500 }
        );
    }

    try {
        // Create a JWT signed with Supabase secret
        const secret = new TextEncoder().encode(jwtSecret);
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = 3600; // 1 hour

        const token = await new jose.SignJWT({
            sub: DEV_TEST_USER_ID,
            email: 'test@projectflow.local',
            role: 'authenticated',
            aud: `${appUrl}/api/mcp`,
            iat: now,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime(now + expiresIn)
            .sign(secret);

        return NextResponse.json({
            access_token: token,
            token_type: 'Bearer',
            expires_in: expiresIn,
        });
    } catch (error) {
        console.error('Error generating token:', error);
        return NextResponse.json(
            {
                error: 'server_error',
                error_description: 'Failed to generate token',
            },
            { status: 500 }
        );
    }
}

