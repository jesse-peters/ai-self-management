/**
 * JWT signing and verification for MCP OAuth tokens
 * Signs JWTs with Supabase's secret so auth.uid() works natively
 */

import * as jose from 'jose';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;
const ISSUER = process.env.NEXT_PUBLIC_APP_URL!;

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
  if (!JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET environment variable is required');
  }
  
  if (!ISSUER) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
  }
  
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
  if (!JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET environment variable is required');
  }
  
  const secret = new TextEncoder().encode(JWT_SECRET);
  
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
}

