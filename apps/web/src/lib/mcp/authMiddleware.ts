/**
 * OAuth Authentication Middleware for MCP
 * Verifies Bearer tokens and provides auth context to request handlers
 */

import { NextRequest } from 'next/server';
import { verifyAccessToken, type MCPTokenClaims } from '@projectflow/core';

/**
 * Auth context extracted from JWT token
 */
export interface AuthContext {
    claims: MCPTokenClaims | null;
    token: string | null;
    userId: string | null;
}

/**
 * Extracts and verifies OAuth token from Authorization header
 * @param request Next.js request object
 * @param audience Expected audience for token validation
 * @returns Auth context with claims, token, and userId
 */
export async function extractAuthContext(
    request: NextRequest,
    audience: string
): Promise<AuthContext> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            claims: null,
            token: null,
            userId: null,
        };
    }

    const token = authHeader.slice(7);

    try {
        const claims = await verifyAccessToken(token, audience);
        return {
            claims,
            token,
            userId: claims.sub,
        };
    } catch (error) {
        // Token validation failed
        return {
            claims: null,
            token,
            userId: null,
        };
    }
}

/**
 * Check if a method requires authentication
 * Some MCP methods like initialize and ping don't need auth
 * Notifications are client-to-server messages and don't require auth
 */
export function methodRequiresAuth(method: string): boolean {
    const publicMethods = [
        'initialize',
        'ping',
        'tools/list',
        'notifications/initialized',
    ];
    return !publicMethods.includes(method);
}

/**
 * Check if user has required scope for a tool
 * Note: Supabase JWTs don't have granular scopes, so this is a placeholder
 */
export function hasScope(claims: MCPTokenClaims, requiredScope: string): boolean {
    // Supabase JWTs don't have scope information
    // All authenticated users can access all tools
    // Scope enforcement happens at the database level via RLS
    return true;
}

