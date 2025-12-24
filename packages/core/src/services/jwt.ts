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
  sub: string;      // User ID (required for auth.uid())
  role: string;     // 'authenticated' (required for Supabase)
  aud: string;      // Audience (resource server URL)
  scope: string;    // MCP scopes
  client_id: string;
  exp?: number;     // Expiration time (Unix timestamp)
  iat?: number;     // Issued at time (Unix timestamp)
}

/**
 * Signs an access token with Supabase's JWT secret
 * This makes auth.uid() work automatically in RLS policies
 */
export async function signAccessToken(
  userId: string,
  clientId: string,
  scopes: string[],
  audience: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const JWT_SECRET = getJWTSecret();
  const ISSUER = getIssuer();
  
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  return await new jose.SignJWT({
    sub: userId,
    role: 'authenticated',  // Required for Supabase RLS
    aud: audience,
    scope: scopes.join(' '),
    client_id: clientId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secret);
}

/**
 * Verifies an access token and returns its claims
 * Validates signature, expiry, and audience
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
      scope: (payload.scope as string) || '',
      client_id: (payload.client_id as string) || '',
      exp: payload.exp as number | undefined,
      iat: payload.iat as number | undefined,
    };
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw error;
  }
}

