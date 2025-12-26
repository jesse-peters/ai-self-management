/**
 * Mock utilities for testing OAuth endpoints
 */

import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@projectflow/db';

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body } = options;

  const requestHeaders = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });

  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    body: body ? body : undefined,
  });
}

/**
 * Create a mock Supabase user
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  };
}

/**
 * Create a mock Supabase session
 */
export function createMockSession(overrides: Partial<any> = {}) {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient(
  user: any = null,
  session: any = null
): Partial<SupabaseClient<Database>> {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'Not authenticated' },
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session },
        error: session ? null : { message: 'No session' },
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: createMockSession() },
        error: null,
      }),
    } as any,
  };
}

/**
 * Create a mock service role client for database operations
 */
export function createMockServiceRoleClient() {
  const createQueryBuilder = () => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  const fromMock = vi.fn((table: string) => createQueryBuilder());
  
  return {
    from: fromMock,
  };
}

/**
 * Create a mock authorization code
 */
export function createMockAuthorizationCode(
  codeData: {
    userId: string;
    codeChallenge: string;
    codeChallengeMethod?: string;
    redirectUri: string;
    accessToken: string;
    refreshToken: string;
    expiresAt?: number;
    scope?: string;
    state?: string;
  }
): string {
  const authCode = `${codeData.userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const encodedData = Buffer.from(JSON.stringify({
    userId: codeData.userId,
    codeChallenge: codeData.codeChallenge,
    codeChallengeMethod: codeData.codeChallengeMethod || 'S256',
    scope: codeData.scope || '',
    redirectUri: codeData.redirectUri,
    accessToken: codeData.accessToken,
    refreshToken: codeData.refreshToken,
    expiresAt: codeData.expiresAt || Date.now() + 10 * 60 * 1000,
    state: codeData.state,
  })).toString('base64url');
  
  return `${authCode}.${encodedData}`;
}

// Import vi for type checking
import { vi } from 'vitest';

