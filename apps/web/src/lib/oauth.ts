/**
 * OAuth helper utilities for MCP authentication
 */

import {
  validateAccessToken,
  revokeToken,
  revokeRefreshToken,
  generateAuthorizationCode,
} from '@projectflow/core';

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
 * Stores authorization codes temporarily (in-memory for now)
 * In production, consider using Redis or database
 */
const authorizationCodes = new Map<
  string,
  {
    userId: string;
    clientId: string;
    redirectUri: string;
    scope: string;
    expiresAt: Date;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }
>();

/**
 * Stores an authorization code
 */
export function storeAuthorizationCode(
  code: string,
  userId: string,
  clientId: string,
  redirectUri: string,
  scope: string,
  codeChallenge?: string,
  codeChallengeMethod?: string
): void {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  authorizationCodes.set(code, {
    userId,
    clientId,
    redirectUri,
    scope,
    expiresAt,
    codeChallenge,
    codeChallengeMethod,
  });

  // Clean up expired codes periodically
  setTimeout(() => {
    authorizationCodes.delete(code);
  }, 10 * 60 * 1000);
}

/**
 * Retrieves and validates an authorization code
 */
export function getAuthorizationCode(code: string): {
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
} | null {
  const codeData = authorizationCodes.get(code);

  if (!codeData) {
    return null;
  }

  if (codeData.expiresAt < new Date()) {
    authorizationCodes.delete(code);
    return null;
  }

  // Delete code after use (one-time use)
  authorizationCodes.delete(code);

  return codeData;
}

/**
 * Validates PKCE code verifier against code challenge
 */
export function validatePKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }

  if (method === 'S256') {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return hash === codeChallenge;
  }

  return false;
}

