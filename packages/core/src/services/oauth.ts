/**
 * OAuth token service - JWT-based tokens for MCP OAuth 2.1
 * Uses Supabase's JWT secret for native auth.uid() support
 */

import { createServiceRoleClient } from '@projectflow/db';
import { NotFoundError, UnauthorizedError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { signAccessToken } from './jwt';
import crypto from 'crypto';

export interface OAuthToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  scope: string | null;
  client_id: string;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  access_token_hash?: string | null;
}

export interface OAuthTokenInsert {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_at: string;
  scope?: string;
  client_id: string;
  access_token_hash?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/**
 * Generates an authorization code
 */
export function generateAuthorizationCode(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Hash a token for secure storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new OAuth token pair with JWT access token
 * @param userId User ID to create token for
 * @param clientId OAuth client ID
 * @param scopes Array of scopes to grant
 * @param audience Audience claim for the JWT (resource server URL)
 */
export async function createOAuthToken(
  userId: string,
  clientId: string,
  scope: string = 'projects:read projects:write tasks:read tasks:write mcp:tools',
  audience?: string
): Promise<OAuthTokenResponse> {
  try {
    validateUUID(userId, 'userId');

    const supabase = createServiceRoleClient();
    const expiresIn = 3600; // 1 hour
    
    // Use audience or default to issuer + /api/mcp
    const aud = audience || `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`;
    
    // Generate JWT access token (signed with Supabase secret)
    const scopes = scope.split(' ');
    const accessToken = await signAccessToken(
      userId,
      clientId,
      scopes,
      aud,
      expiresIn
    );

    // Generate opaque refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Store tokens in database with hash of access token
    const { data: token, error } = await (supabase
      .from('oauth_tokens')
      .insert([
        {
          user_id: userId,
          access_token: accessToken,
          access_token_hash: hashToken(accessToken),
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          scope: scope,
          client_id: clientId,
        },
      ] as any)
      .select()
      .single() as any);

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!token) {
      throw new Error('Failed to create OAuth token');
    }

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: scope,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
      throw error;
    }
    throw new Error(`Failed to create OAuth token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates an access token and returns the associated user ID
 * Note: For JWT tokens, use verifyAccessToken from jwt.ts instead
 * This is kept for backward compatibility and refresh token validation
 */
export async function validateAccessToken(token: string): Promise<string> {
  try {
    const supabase = createServiceRoleClient();
    const tokenHash = hashToken(token);

    const { data: tokenData, error } = await (supabase
      .from('oauth_tokens')
      .select('user_id, expires_at, revoked_at')
      .eq('access_token_hash', tokenHash)
      .single() as any);

    if (error || !tokenData) {
      throw new UnauthorizedError('Invalid access token');
    }

    // Check if token is revoked
    if (tokenData.revoked_at) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      throw new UnauthorizedError('Access token has expired');
    }

    return tokenData.user_id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Failed to validate access token');
  }
}

/**
 * Refreshes an access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  audience?: string
): Promise<OAuthTokenResponse> {
  try {
    const supabase = createServiceRoleClient();

    // Find the token by refresh token
    const { data: existingToken, error: findError } = await (supabase
      .from('oauth_tokens')
      .select('*')
      .eq('refresh_token', refreshToken)
      .single() as any);

    if (findError || !existingToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is revoked
    if (existingToken.revoked_at) {
      throw new UnauthorizedError('Token has been revoked');
    }

    const expiresIn = 3600; // 1 hour
    const aud = audience || `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`;
    
    // Generate new JWT access token
    const scopes = (existingToken.scope || '').split(' ');
    const newAccessToken = await signAccessToken(
      existingToken.user_id,
      existingToken.client_id,
      scopes,
      aud,
      expiresIn
    );

    // Update the token
    const { data: updatedToken, error: updateError } = await (supabase
      .from('oauth_tokens')
      .update({
        access_token: newAccessToken,
        access_token_hash: hashToken(newAccessToken),
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', existingToken.id)
      .select()
      .single() as any);

    if (updateError || !updatedToken) {
      throw mapSupabaseError(updateError || new Error('Failed to refresh token'));
    }

    return {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken, // Same refresh token
      scope: existingToken.scope || '',
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError(`Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Revokes an access token
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const tokenHash = hashToken(token);

    const { error } = await (supabase
      .from('oauth_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('access_token_hash', tokenHash)
      .select() as any);

    if (error) {
      throw mapSupabaseError(error);
    }
  } catch (error) {
    throw new Error(`Failed to revoke token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Revokes a refresh token (and associated access token)
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await (supabase
      .from('oauth_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('refresh_token', refreshToken)
      .select() as any);

    if (error) {
      throw mapSupabaseError(error);
    }
  } catch (error) {
    throw new Error(`Failed to revoke refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cleans up expired and revoked tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    // Delete tokens that are expired and revoked, or expired more than 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await (supabase
      .from('oauth_tokens')
      .delete()
      .or(`expires_at.lt.${sevenDaysAgo},and(revoked_at.not.is.null,expires_at.lt.${now})`)
      .select() as any);

    if (error) {
      throw mapSupabaseError(error);
    }

    return data?.length || 0;
  } catch (error) {
    throw new Error(`Failed to cleanup expired tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets token information by access token hash
 */
export async function getTokenByAccessToken(accessToken: string): Promise<OAuthToken | null> {
  try {
    const supabase = createServiceRoleClient();
    const tokenHash = hashToken(accessToken);

    const { data, error } = await (supabase
      .from('oauth_tokens')
      .select('*')
      .eq('access_token_hash', tokenHash)
      .single() as any);

    if (error || !data) {
      return null;
    }

    return data as OAuthToken;
  } catch (error) {
    return null;
  }
}
