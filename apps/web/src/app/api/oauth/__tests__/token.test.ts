/**
 * Tests for OAuth token exchange endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../token/route';
import { createMockRequest, createMockAuthorizationCode, createMockUser, createMockSession, createMockSupabaseClient, createMockServiceRoleClient } from '@/__tests__/helpers/mocks';
import { generatePKCEPair, generateInvalidVerifier, generateShortVerifier } from '@/__tests__/helpers/pkce';
import * as supabaseClientModule from '@/lib/supabaseClient';
import * as dbModule from '@projectflow/db';
import { createHash } from 'crypto';

// Mock dependencies
vi.mock('@/lib/supabaseClient');
vi.mock('@projectflow/db');
vi.mock('@/lib/logger');
vi.mock('@/lib/correlationId');

describe('OAuth Token Exchange Endpoint', () => {
  const baseUrl = 'http://localhost:3000';
  const redirectUri = 'cursor://oauth-callback';
  const scope = 'projects tasks';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization Code Grant', () => {
    it('should exchange valid authorization code for tokens', async () => {
      const { verifier, challenge } = generatePKCEPair();
      const user = createMockUser();
      const session = createMockSession();

      const code = createMockAuthorizationCode({
        userId: user.id,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        redirectUri,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        scope,
      });

      const mockServiceRole = createMockServiceRoleClient();
      // Mock no pending request found (using self-contained code)
      mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.access_token).toBe(session.access_token);
      expect(data.refresh_token).toBe(session.refresh_token);
      expect(data.token_type).toBe('Bearer');
      expect(data.expires_in).toBe(3600);
    });

    it('should verify PKCE with correct verifier', async () => {
      const { verifier, challenge } = generatePKCEPair();
      const user = createMockUser();
      const session = createMockSession();

      const code = createMockAuthorizationCode({
        userId: user.id,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        redirectUri,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });

      const mockServiceRole = createMockServiceRoleClient();
      mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should reject PKCE verification with incorrect verifier', async () => {
      const { challenge } = generatePKCEPair();
      const wrongVerifier = generatePKCEPair().verifier; // Different verifier
      const user = createMockUser();
      const session = createMockSession();

      const code = createMockAuthorizationCode({
        userId: user.id,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        redirectUri,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });

      const mockServiceRole = createMockServiceRoleClient();
      mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: wrongVerifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_grant');
      expect(data.error_description).toContain('Code verifier does not match');
    });

    it('should reject expired authorization code', async () => {
      const { verifier, challenge } = generatePKCEPair();
      const user = createMockUser();
      const session = createMockSession();

      // Create code with expired timestamp
      const code = createMockAuthorizationCode({
        userId: user.id,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        redirectUri,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });

      const mockServiceRole = createMockServiceRoleClient();
      mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_grant');
      expect(data.error_description).toContain('expired');
    });

    it('should reject invalid authorization code format', async () => {
      const { verifier } = generatePKCEPair();

      const mockServiceRole = createMockServiceRoleClient();
      mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'invalid-code-format',
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_grant');
      expect(data.error_description).toContain('format');
    });

    it('should reject redirect URI mismatch', async () => {
      const { verifier, challenge } = generatePKCEPair();
      const user = createMockUser();
      const session = createMockSession();

      const code = createMockAuthorizationCode({
        userId: user.id,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        redirectUri: 'cursor://oauth-callback', // Original redirect URI
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });

      const mockServiceRole = createMockServiceRoleClient();
      mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'cursor://different-callback', // Different redirect URI
        code_verifier: verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_grant');
      expect(data.error_description).toContain('redirect_uri');
    });

    it('should use authorization code from pending request when available', async () => {
      const { verifier, challenge } = generatePKCEPair();
      const user = createMockUser();
      const session = createMockSession();

      const codeFromRequest = createMockAuthorizationCode({
        userId: user.id,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        redirectUri,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });

      const codeFromDB = createMockAuthorizationCode({
        userId: user.id,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        redirectUri,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });

      const computedChallenge = createHash('sha256').update(verifier).digest('base64url');
      const pendingRequest = {
        id: 'pending-id',
        client_id: 'test-client',
        code_challenge: computedChallenge,
        authorization_code: codeFromDB,
      };

      const mockServiceRole = createMockServiceRoleClient();
      mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
      mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
        data: pendingRequest,
        error: null,
      });
      
      const deleteMock = vi.fn().mockResolvedValue({ error: null });
      mockServiceRole.from('oauth_pending_requests').delete = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      
      vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: codeFromRequest,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Should have deleted the pending request
      expect(mockServiceRole.from('oauth_pending_requests').delete).toHaveBeenCalled();
    });
  });

  describe('Parameter Validation', () => {
    it('should reject missing grant_type', async () => {
      const body = new URLSearchParams({
        code: 'test-code',
        redirect_uri: redirectUri,
        code_verifier: generatePKCEPair().verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('grant_type');
    });

    it('should reject missing code', async () => {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: generatePKCEPair().verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('code');
    });

    it('should reject missing redirect_uri', async () => {
      const { verifier, challenge } = generatePKCEPair();
      const code = createMockAuthorizationCode({
        userId: 'user-id',
        codeChallenge: challenge,
        redirectUri,
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('redirect_uri');
    });

    it('should reject missing code_verifier', async () => {
      const { challenge } = generatePKCEPair();
      const code = createMockAuthorizationCode({
        userId: 'user-id',
        codeChallenge: challenge,
        redirectUri,
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('code_verifier');
    });

    it('should reject invalid code_verifier format', async () => {
      const { challenge } = generatePKCEPair();
      const code = createMockAuthorizationCode({
        userId: 'user-id',
        codeChallenge: challenge,
        redirectUri,
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: generateInvalidVerifier(),
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('code_verifier');
    });
  });

  describe('Refresh Token Grant', () => {
    it('should refresh access token with valid refresh token', async () => {
      const newSession = createMockSession();
      const mockSupabase = createMockSupabaseClient(null, null);
      mockSupabase.auth!.refreshSession = vi.fn().mockResolvedValue({
        data: { session: newSession },
        error: null,
      });
      vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'valid-refresh-token',
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.access_token).toBe(newSession.access_token);
      expect(data.refresh_token).toBe(newSession.refresh_token);
      expect(data.token_type).toBe('Bearer');
    });

    it('should reject invalid refresh token', async () => {
      const mockSupabase = createMockSupabaseClient(null, null);
      mockSupabase.auth!.refreshSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      });
      vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'invalid-refresh-token',
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_grant');
    });

    it('should reject missing refresh_token parameter', async () => {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('refresh_token');
    });
  });

  describe('Unsupported Grant Types', () => {
    it('should reject unsupported grant type', async () => {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
      });

      const request = createMockRequest(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('unsupported_grant_type');
    });
  });
});

