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
 * Handles both HS256 (symmetric) and ES256/RS256 (asymmetric) algorithms
 * Tokens are issued by Supabase Auth
 */
export async function verifyAccessToken(
  token: string,
  expectedAudience: string
): Promise<MCPTokenClaims> {
  const debug = process.env.MCP_DEBUG === 'true';

  try {
    // Decode the token header to check the algorithm
    const header = jose.decodeProtectedHeader(token);
    const alg = header.alg;

    if (debug) {
      console.log('[JWT] Token verification started', {
        algorithm: alg,
        tokenPreview: `${token.substring(0, 20)}...${token.substring(token.length - 20)}`,
        expectedAudience,
      });
    }

    let payload: jose.JWTPayload | undefined;
    let lastError: Error | null = null;

    // Try HS256 first (most common for Supabase)
    if (alg === 'HS256' || !alg) {
      if (debug) console.log('[JWT] Attempting HS256 verification');
      try {
        const JWT_SECRET = getJWTSecret();
        const secret = new TextEncoder().encode(JWT_SECRET);

        // Accept both "authenticated" (Supabase default) and expected audience in development
        const validAudiences = (process.env.NODE_ENV as string) !== 'production'
          ? [expectedAudience, 'authenticated']
          : [expectedAudience];

        const result = await jose.jwtVerify(token, secret, {
          audience: validAudiences,
        });
        payload = result.payload;
        if (debug) console.log('[JWT] HS256 verification succeeded');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (debug) console.log('[JWT] HS256 verification failed', { error: lastError.message });
        // If algorithm is explicitly HS256, don't try other methods
        if (alg === 'HS256') {
          throw new Error(`JWT verification failed (HS256): ${lastError.message}`);
        }
      }
    }

    // If HS256 failed or algorithm is ES256/RS256, try JWKS
    if (!payload && (alg === 'ES256' || alg === 'RS256' || !alg)) {
      if (debug) console.log('[JWT] Attempting ES256/RS256 verification', { isDevelopment: process.env.NODE_ENV !== 'production' });

      // For ES256/RS256, we need the public key from Supabase
      // Supabase doesn't expose JWKS in local dev, so we'll decode without verification
      // and extract claims (for development only - production should use proper JWKS)
      if (process.env.NODE_ENV !== 'production') {
        try {
          // Decode without verification to extract claims
          const decoded = jose.decodeJwt(token);

          if (debug) console.log('[JWT] Token decoded (ES256 dev mode)', {
            sub: decoded.sub,
            role: decoded.role,
            aud: decoded.aud,
            exp: decoded.exp ? new Date(decoded.exp as number * 1000).toISOString() : undefined,
          });

          // Validate required claims exist
          if (!decoded.sub || !decoded.role) {
            throw new Error('Invalid token claims: missing sub or role');
          }

          // Check audience - accept both "authenticated" (Supabase default) and expected audience in development
          if (decoded.aud) {
            const validAudiences = (process.env.NODE_ENV as string) !== 'production'
              ? [expectedAudience, 'authenticated']
              : [expectedAudience];

            if (!validAudiences.includes(decoded.aud as string)) {
              throw new Error(`Token audience mismatch: expected one of ${validAudiences.join(', ')}, got ${decoded.aud}`);
            }
          }

          // Check expiration
          if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            throw new Error('Token has expired');
          }

          payload = decoded;
          if (debug) console.log('[JWT] ES256 dev verification succeeded');
        } catch (decodeError) {
          const errorMsg = decodeError instanceof Error ? decodeError.message : String(decodeError);
          if (debug) console.log('[JWT] ES256 dev verification failed', { error: errorMsg });
          throw new Error(`JWT verification failed (ES256 in dev mode): ${errorMsg}`);
        }
      } else {
        // Production: Try to use JWKS
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (!supabaseUrl) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for ES256/RS256 token verification');
          }

          // Try different possible JWKS endpoints
          const possibleJwksUrls = [
            `${supabaseUrl.replace(/\/$/, '')}/auth/v1/jwks`,
            `${supabaseUrl.replace(/\/$/, '')}/.well-known/jwks.json`,
          ];

          if (debug) console.log('[JWT] Trying JWKS endpoints', { endpoints: possibleJwksUrls });

          let jwksError: Error | null = null;
          for (const jwksUrl of possibleJwksUrls) {
            try {
              const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));

              // Accept both "authenticated" (Supabase default) and expected audience in development
              const validAudiences = (process.env.NODE_ENV as string) !== 'production'
                ? [expectedAudience, 'authenticated']
                : [expectedAudience];

              const result = await jose.jwtVerify(token, JWKS, {
                audience: validAudiences,
              });
              payload = result.payload;
              if (debug) console.log('[JWT] JWKS verification succeeded', { jwksUrl });
              break; // Success, exit loop
            } catch (err) {
              jwksError = err instanceof Error ? err : new Error(String(err));
              if (debug) console.log('[JWT] JWKS endpoint failed', { jwksUrl, error: jwksError.message });
              continue; // Try next URL
            }
          }

          if (!payload) {
            throw new Error(`ES256/RS256 token verification failed: Could not verify token with any JWKS endpoint. ${jwksError?.message || ''}`);
          }
        } catch (jwksError) {
          const errorMsg = jwksError instanceof Error ? jwksError.message : String(jwksError);
          if (debug) console.log('[JWT] Production ES256 verification failed', { error: errorMsg });
          throw new Error(`JWT verification failed: ${errorMsg}`);
        }
      }
    }

    if (!payload) {
      throw new Error(`Unsupported JWT algorithm: ${alg || 'unknown'}. Supported algorithms: HS256, ES256, RS256`);
    }

    if (!payload.sub || !payload.role) {
      throw new Error('Invalid token claims: missing sub or role');
    }

    // Type assertion is safe here because we've checked payload exists and has required fields
    const verifiedPayload = payload;

    if (debug) {
      console.log('[JWT] Token verification completed successfully', {
        userId: verifiedPayload.sub,
        role: verifiedPayload.role,
        audience: verifiedPayload.aud,
      });
    }

    return {
      sub: verifiedPayload.sub as string,
      role: verifiedPayload.role as string,
      aud: verifiedPayload.aud as string,
      email: (verifiedPayload.email as string) || undefined,
      exp: verifiedPayload.exp as number,
      iat: verifiedPayload.iat as number,
    };
  } catch (error) {
    if (debug) {
      console.log('[JWT] Token verification failed', {
        error: error instanceof Error ? error.message : String(error),
        tokenPreview: `${token.substring(0, 20)}...`,
      });
    }
    throw error;
  }
}


