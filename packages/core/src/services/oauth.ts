/**
 * OAuth token service - handles OAuth token management
 */

import { createServerClient } from '@projectflow/db';
import { NotFoundError, UnauthorizedError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
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
}

export interface OAuthTokenInsert {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_at: string;
  scope?: string;
  client_id: string;
}

/**
 * Generates a secure random token
 */
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates an authorization code
 */
export function generateAuthorizationCode(): string {
  return generateToken(24);
}

/**
 * Creates a new OAuth token pair
 */
export async function createOAuthToken(
  userId: string,
  clientId: string,
  scope: string = 'projects:read projects:write tasks:read tasks:write sessions:read sessions:write'
): Promise<OAuthToken> {
  try {
    validateUUID(userId, 'userId');

    const supabase = createServerClient();

    // Generate tokens
    const accessToken = generateToken(32);
    const refreshToken = generateToken(32);

    // Set expiration: access token 1 hour, refresh token 30 days
    const now = new Date();
    const accessTokenExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    const refreshTokenExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { data: token, error } = await (supabase
      .from('oauth_tokens')
      .insert([
        {
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_at: accessTokenExpires.toISOString(),
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

    return token as OAuthToken;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
      throw error;
    }
    throw new Error(`Failed to create OAuth token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates an access token and returns the associated user ID
 */
export async function validateAccessToken(token: string): Promise<string> {
  try {
    const supabase = createServerClient();

    const { data: tokenData, error } = await (supabase
      .from('oauth_tokens')
      .select('user_id, expires_at, revoked_at')
      .eq('access_token', token)
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
export async function refreshAccessToken(refreshToken: string): Promise<OAuthToken> {
  try {
    const supabase = createServerClient();

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

    // Generate new tokens
    const newAccessToken = generateToken(32);
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    // Update the token
    const { data: updatedToken, error: updateError } = await (supabase
      .from('oauth_tokens')
      .update({
        access_token: newAccessToken,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', existingToken.id)
      .select()
      .single() as any);

    if (updateError || !updatedToken) {
      throw mapSupabaseError(updateError || new Error('Failed to refresh token'));
    }

    return updatedToken as OAuthToken;
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
    const supabase = createServerClient();

    const { error } = await (supabase
      .from('oauth_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('access_token', token)
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
    const supabase = createServerClient();

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
    const supabase = createServerClient();
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
 * Gets token information by access token
 */
export async function getTokenByAccessToken(accessToken: string): Promise<OAuthToken | null> {
  try {
    const supabase = createServerClient();

    const { data, error } = await (supabase
      .from('oauth_tokens')
      .select('*')
      .eq('access_token', accessToken)
      .single() as any);

    if (error || !data) {
      return null;
    }

    return data as OAuthToken;
  } catch (error) {
    return null;
  }
}

