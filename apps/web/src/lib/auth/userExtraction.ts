/**
 * User extraction utilities for Sentry context
 * Extracts user information from various authentication methods
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { verifyAccessToken, type MCPTokenClaims } from '@projectflow/core';

export interface ExtractedUser {
    id: string;
    email?: string;
    username?: string;
}

/**
 * Extracts user information from a Next.js request
 * Tries multiple authentication methods:
 * 1. Supabase session from cookies
 * 2. JWT token from Authorization header
 * 
 * @param request - Next.js request object
 * @returns User information or null if not authenticated
 */
export async function extractUserFromRequest(
    request: NextRequest
): Promise<ExtractedUser | null> {
    // Try to extract from Supabase session (cookies)
    try {
        const supabase = await createServerClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!error && user) {
            return {
                id: user.id,
                email: user.email,
                // Username might be in user_metadata
                username: user.user_metadata?.username || user.user_metadata?.name,
            };
        }
    } catch (error) {
        // Silently fail - will try other methods
        if (process.env.NODE_ENV === 'development') {
            console.debug('[UserExtraction] Failed to extract from Supabase session:', error);
        }
    }

    // Try to extract from JWT token in Authorization header
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7); // Remove 'Bearer ' prefix

            // Determine audience from request
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
            const audience = `${appUrl}/api/mcp`;

            try {
                const claims = await verifyAccessToken(token, audience) as MCPTokenClaims;
                
                return {
                    id: claims.sub,
                    email: claims.email,
                    // Username might not be in JWT claims
                };
            } catch (tokenError) {
                // Token verification failed - not a valid token
                if (process.env.NODE_ENV === 'development') {
                    console.debug('[UserExtraction] Token verification failed:', tokenError);
                }
            }
        }
    } catch (error) {
        // Silently fail
        if (process.env.NODE_ENV === 'development') {
            console.debug('[UserExtraction] Failed to extract from JWT token:', error);
        }
    }

    // No user found
    return null;
}

/**
 * Extracts user ID from a request (lightweight version)
 * Returns just the user ID without making full user extraction calls
 * Useful for quick checks where full user info isn't needed
 * 
 * @param request - Next.js request object
 * @returns User ID or null if not authenticated
 */
export async function extractUserIdFromRequest(
    request: NextRequest
): Promise<string | null> {
    const user = await extractUserFromRequest(request);
    return user?.id || null;
}

