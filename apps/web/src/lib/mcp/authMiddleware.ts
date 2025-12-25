/**
 * OAuth Authentication Middleware for MCP
 * Verifies Bearer tokens and provides auth context to request handlers
 */

import { NextRequest } from 'next/server';
import { verifyAccessToken, type MCPTokenClaims } from '@projectflow/core';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

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
    // Create logger for this request
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'auth');

    const authHeader = request.headers.get('Authorization');

    // Log whether Authorization header is present
    logger.debug({
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader?.substring(0, 20) || 'none',
        expectedAudience: audience,
    }, 'Checking Authorization header');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn({
            hasAuthHeader: !!authHeader,
            authHeaderLength: authHeader?.length || 0,
            startsWithBearer: authHeader?.startsWith('Bearer ') || false,
        }, 'No valid Authorization header found');
        return {
            claims: null,
            token: null,
            userId: null,
        };
    }

    const token = authHeader.slice(7);
    const tokenPreview = token.length > 20 ? `${token.substring(0, 20)}...` : token.substring(0, token.length);

    logger.debug({
        tokenLength: token.length,
        tokenPreview,
        expectedAudience: audience,
    }, 'Extracting token from Authorization header');

    try {
        const claims = await verifyAccessToken(token, audience);

        logger.info({
            userId: claims.sub,
            email: claims.email,
            role: claims.role,
            audience: claims.aud,
            expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
            issuedAt: claims.iat ? new Date(claims.iat * 1000).toISOString() : null,
        }, 'Token verified successfully');

        return {
            claims,
            token,
            userId: claims.sub,
        };
    } catch (error) {
        // Log detailed error information
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorName = error instanceof Error ? error.name : 'UnknownError';

        // Try to decode token to get more info (even if invalid)
        let tokenInfo: any = {};
        try {
            // Decode without verification to see what's in the token
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
                tokenInfo = {
                    hasPayload: true,
                    tokenAudience: payload.aud,
                    tokenSubject: payload.sub,
                    tokenExpiry: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
                    tokenIssuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
                    isExpired: payload.exp ? Date.now() / 1000 > payload.exp : null,
                };
            }
        } catch (decodeError) {
            tokenInfo = { decodeError: decodeError instanceof Error ? decodeError.message : 'Failed to decode' };
        }

        logger.warn({
            error: errorMessage,
            errorName,
            expectedAudience: audience,
            tokenLength: token.length,
            tokenPreview,
            ...tokenInfo,
        }, 'Token validation failed');

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

