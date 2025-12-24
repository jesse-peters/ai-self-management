/**
 * OAuth helper utilities for MCP authentication
 * 
 * IMPORTANT: Authorization codes are now persisted to Supabase database
 * instead of in-memory storage. This ensures they survive server restarts
 * and work across multiple serverless instances.
 */

import {
  validateAccessToken,
  revokeToken,
  revokeRefreshToken,
  generateAuthorizationCode,
} from '@projectflow/core';
import { createServiceRoleClient } from '@projectflow/db';
import type { Database } from '@projectflow/db';
import crypto from 'crypto';

/**
 * Validates an OAuth access token
 * Returns the user ID if valid, throws error if invalid
 */
export async function validateOAuthToken(token: string): Promise<string> {
  return validateAccessToken(token);
}

/**
 * Revokes an OAuth access token
 */
export async function revokeOAuthToken(token: string): Promise<void> {
  return revokeToken(token);
}

/**
 * Revokes an OAuth refresh token
 */
export async function revokeOAuthRefreshToken(refreshToken: string): Promise<void> {
  return revokeRefreshToken(refreshToken);
}

/**
 * Generates a new authorization code
 * 
 * @deprecated This function is no longer used with Supabase OAuth 2.1 proxy.
 * Supabase OAuth 2.1 server now manages authorization codes.
 * Kept for backward compatibility only.
 */
export function generateOAuthAuthorizationCode(): string {
  return generateAuthorizationCode();
}

/**
 * Validates OAuth authorization request parameters
 */
export interface AuthorizationRequest {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export function validateAuthorizationRequest(params: URLSearchParams): AuthorizationRequest {
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const responseType = params.get('response_type');
  const scope = params.get('scope') || undefined;
  const state = params.get('state') || undefined;
  const codeChallenge = params.get('code_challenge') || undefined;
  const codeChallengeMethod = params.get('code_challenge_method') || undefined;

  if (!clientId) {
    throw new Error('Missing client_id parameter');
  }

  if (!redirectUri) {
    throw new Error('Missing redirect_uri parameter');
  }

  if (responseType !== 'code') {
    throw new Error('Invalid response_type. Must be "code"');
  }

  // Validate redirect URI format
  try {
    new URL(redirectUri);
  } catch {
    throw new Error('Invalid redirect_uri format');
  }

  return {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
  };
}

/**
 * Validates OAuth token request parameters
 */
export interface TokenRequest {
  grant_type: string;
  code?: string;
  refresh_token?: string;
  redirect_uri?: string;
  client_id: string;
  client_secret?: string;
  code_verifier?: string;
}

export function validateTokenRequest(body: Record<string, unknown>): TokenRequest {
  const grantType = body.grant_type as string;
  const code = body.code as string | undefined;
  const refreshToken = body.refresh_token as string | undefined;
  const redirectUri = body.redirect_uri as string | undefined;
  const clientId = body.client_id as string;
  const clientSecret = body.client_secret as string | undefined;
  const codeVerifier = body.code_verifier as string | undefined;

  if (!grantType) {
    throw new Error('Missing grant_type parameter');
  }

  if (!['authorization_code', 'refresh_token'].includes(grantType)) {
    throw new Error('Invalid grant_type. Must be "authorization_code" or "refresh_token"');
  }

  if (grantType === 'authorization_code' && !code) {
    throw new Error('Missing code parameter for authorization_code grant');
  }

  if (grantType === 'refresh_token' && !refreshToken) {
    throw new Error('Missing refresh_token parameter for refresh_token grant');
  }

  if (!clientId) {
    throw new Error('Missing client_id parameter');
  }

  return {
    grant_type: grantType,
    code,
    refresh_token: refreshToken,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
  };
}

/**
 * Stores an authorization code in Supabase database
 * 
 * Authorization codes are:
 * - One-time use only
 * - Valid for 10 minutes
 * - Scoped to a specific client, user, and redirect URI
 * 
 * @deprecated This function is no longer used with Supabase OAuth 2.1 proxy.
 * Supabase OAuth 2.1 server now manages authorization codes.
 * Kept for backward compatibility only.
 */
export async function storeAuthorizationCode(
  code: string,
  userId: string,
  clientId: string,
  redirectUri: string,
  scope: string,
  codeChallenge?: string,
  codeChallengeMethod?: string
): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth.ts:170', message: 'storeAuthorizationCode entry', data: { hasCode: !!code, codePrefix: code.substring(0, 8), userId, clientId, hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY, serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'K' }) }).catch(() => { });
  // #endregion

  const client = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const insertData = {
    code,
    user_id: userId,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    code_challenge: codeChallenge || null,
    code_challenge_method: codeChallengeMethod || null,
    expires_at: expiresAt.toISOString(),
  };

  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth.ts:188', message: 'Before Supabase client insert', data: { table: 'oauth_authorization_codes', hasUserId: !!insertData.user_id, userIdType: typeof insertData.user_id, userIdLength: insertData.user_id?.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'M' }) }).catch(() => { });
  // #endregion

  // Use Supabase client library with service role key - this properly bypasses RLS
  const { error } = await (client as any)
    .from('oauth_authorization_codes')
    .insert(insertData);

  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/e27fe125-aa67-4121-8824-12e85572d45c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'oauth.ts:203', message: 'After Supabase client insert', data: { hasError: !!error, errorMessage: error?.message, errorCode: error?.code, errorDetails: error?.details, errorHint: error?.hint }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'M' }) }).catch(() => { });
  // #endregion

  if (error) {
    throw new Error(`Failed to store authorization code: ${error.message}`);
  }
}

/**
 * Retrieves and validates an authorization code
 * 
 * Performs the following checks:
 * - Code exists in database
 * - Code has not expired
 * - Code has not been used before
 * 
 * Marks code as used (one-time use enforcement)
 * 
 * @deprecated This function is no longer used with Supabase OAuth 2.1 proxy.
 * Supabase OAuth 2.1 server now manages authorization codes.
 * Kept for backward compatibility only.
 */
export async function getAuthorizationCode(code: string): Promise<{
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
} | null> {
  const client = createServiceRoleClient();

  const { data, error } = await (client as any)
    .from('oauth_authorization_codes')
    .select('*')
    .eq('code', code)
    .is('used_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if code has expired
  if (new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Mark code as used (one-time use enforcement)
  await (client as any)
    .from('oauth_authorization_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('code', code);

  return {
    userId: data.user_id,
    clientId: data.client_id,
    redirectUri: data.redirect_uri,
    scope: data.scope,
    codeChallenge: data.code_challenge,
    codeChallengeMethod: data.code_challenge_method,
  };
}

/**
 * Validates PKCE code verifier against code challenge
 * Implements PKCE validation according to RFC 7636
 */
export function validatePKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
  try {
    if (method === 'plain') {
      return codeVerifier === codeChallenge;
    }

    if (method === 'S256') {
      // S256: SHA256 hash of verifier, base64url encoded
      const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      return hash === codeChallenge;
    }

    return false;
  } catch {
    return false;
  }
}

