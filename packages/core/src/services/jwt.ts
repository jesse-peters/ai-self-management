/**
 * JWT signing and verification for MCP OAuth tokens
 * Signs JWTs with Supabase's secret so auth.uid() works natively
 */

import * as jose from 'jose';

// Helper functions to read environment variables dynamically
// (not at module import time, but at function call time)
function getJWTSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET environment variable is required');
  }
  return secret;
}

function getIssuer(): string {
  const issuer = process.env.NEXT_PUBLIC_APP_URL;
  if (!issuer) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
  }
  return issuer;
}

export interface MCPTokenClaims {
  sub: string;      // User ID
  role: string;     // 'authenticated'
  aud: string;      // Audience (resource server URL)
  email?: string;   // Email address
  exp: number;      // Expiration time (Unix timestamp)
  iat: number;      // Issued at time (Unix timestamp)
}

/**
 * Verifies an access token and returns its claims
 * Validates signature, expiry, and audience
 * Tokens are now issued by Supabase Auth, not signed locally
 */
export async function verifyAccessToken(
  token: string,
  expectedAudience: string
): Promise<MCPTokenClaims> {
  const JWT_SECRET = getJWTSecret();
  
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      audience: expectedAudience,
    });
    
    if (!payload.sub || !payload.role) {
      throw new Error('Invalid token claims: missing sub or role');
    }
    
    return {
      sub: payload.sub as string,
      role: payload.role as string,
      aud: payload.aud as string,
      email: (payload.email as string) || undefined,
      exp: payload.exp as number,
      iat: payload.iat as number,
    };
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw error;
  }
}


