/**
 * Tests for OAuth authorization endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../authorize/route';
import { createMockRequest, createMockUser, createMockSession, createMockSupabaseClient, createMockServiceRoleClient } from '@/__tests__/helpers/mocks';
import { generatePKCEPair, generateInvalidChallenge } from '@/__tests__/helpers/pkce';
import * as supabaseClientModule from '@/lib/supabaseClient';
import * as dbModule from '@projectflow/db';

// Mock dependencies
vi.mock('@/lib/supabaseClient');
vi.mock('@projectflow/db');
vi.mock('@/lib/logger');
vi.mock('@/lib/correlationId');

describe('OAuth Authorization Endpoint', () => {
    const baseUrl = 'http://localhost:3000';
    const clientId = 'test-client-id';
    const redirectUri = 'cursor://oauth-callback';
    const scope = 'projects tasks';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Unauthenticated Requests', () => {
        it('should return authorization_pending for programmatic requests', async () => {
            const { verifier, challenge } = generatePKCEPair();
            const state = 'test-state';

            const mockSupabase = createMockSupabaseClient(null, null);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

            const mockServiceRole = createMockServiceRoleClient();
            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            // Mock successful pending request insert
            mockServiceRole.from('oauth_pending_requests').insert = vi.fn().mockResolvedValue({
                error: null,
            });

            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', redirectUri);
            url.searchParams.set('code_challenge', challenge);
            url.searchParams.set('code_challenge_method', 'S256');
            url.searchParams.set('state', state);
            url.searchParams.set('scope', scope);

            const request = createMockRequest(url.toString(), {
                headers: {
                    'user-agent': 'Cursor/1.0',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('authorization_pending');
            expect(data.verification_uri).toBeDefined();
            expect(data.verification_uri).toContain('/oauth/authorize');
        });

        it('should store pending request in database', async () => {
            const { challenge } = generatePKCEPair();

            const mockSupabase = createMockSupabaseClient(null, null);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

            const mockServiceRole = createMockServiceRoleClient();
            // Setup insert to return success
            const insertChain = {
                insert: vi.fn().mockResolvedValue({ error: null }),
            };
            (mockServiceRole.from as any) = vi.fn(() => insertChain as any);
            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', redirectUri);
            url.searchParams.set('code_challenge', challenge);
            url.searchParams.set('code_challenge_method', 'S256');

            const request = createMockRequest(url.toString(), {
                headers: {
                    'user-agent': 'Cursor/1.0',
                },
            });

            await GET(request);

            expect(mockServiceRole.from).toHaveBeenCalledWith('oauth_pending_requests');
        });

        it('should reject invalid code challenge format', async () => {
            const invalidChallenge = generateInvalidChallenge();

            const mockSupabase = createMockSupabaseClient(null, null);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', redirectUri);
            url.searchParams.set('code_challenge', invalidChallenge);
            url.searchParams.set('code_challenge_method', 'S256');

            const request = createMockRequest(url.toString());

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('invalid_request');
            expect(data.error_description).toContain('code_challenge');
        });
    });

    describe('Authenticated Requests', () => {
        it('should create authorization code with PKCE challenge', async () => {
            const { verifier, challenge } = generatePKCEPair();
            const state = 'test-state';

            const user = createMockUser();
            const session = createMockSession();
            const mockSupabase = createMockSupabaseClient(user, session);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

            const mockServiceRole = createMockServiceRoleClient();
            // Mock pending request lookup - no pending request found
            mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            });
            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', redirectUri);
            url.searchParams.set('code_challenge', challenge);
            url.searchParams.set('code_challenge_method', 'S256');
            url.searchParams.set('state', state);
            url.searchParams.set('scope', scope);

            const request = createMockRequest(url.toString());

            const response = await GET(request);

            // Should redirect to callback page for cursor:// redirects
            expect(response.status).toBe(302);
            const location = response.headers.get('location');
            expect(location).toBeDefined();
            expect(location).toContain('/oauth/callback');
            expect(location).toContain('code=');
            expect(location).toContain('state=');
        });

        it('should include code challenge in authorization code', async () => {
            const { challenge } = generatePKCEPair();

            const user = createMockUser();
            const session = createMockSession();
            const mockSupabase = createMockSupabaseClient(user, session);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

            const mockServiceRole = createMockServiceRoleClient();
            mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            });
            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', redirectUri);
            url.searchParams.set('code_challenge', challenge);
            url.searchParams.set('code_challenge_method', 'S256');

            const request = createMockRequest(url.toString());

            const response = await GET(request);

            expect(response.status).toBe(302);
            const location = response.headers.get('location');
            expect(location).toBeDefined();

            // Extract code from redirect URL
            const redirectUrl = new URL(location!);
            const code = redirectUrl.searchParams.get('code');
            expect(code).toBeDefined();

            // Decode and verify code contains challenge
            const codeParts = code!.split('.');
            expect(codeParts.length).toBe(2);
            const decodedData = JSON.parse(Buffer.from(codeParts[1], 'base64url').toString());
            expect(decodedData.codeChallenge).toBe(challenge);
        });

        it('should update pending request with authorization code', async () => {
            const { challenge } = generatePKCEPair();

            const user = createMockUser();
            const session = createMockSession();
            const mockSupabase = createMockSupabaseClient(user, session);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

            const mockServiceRole = createMockServiceRoleClient();
            const pendingRequest = {
                id: 'pending-request-id',
                client_id: clientId,
                code_challenge: challenge,
            };

            mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
                data: pendingRequest,
                error: null,
            });

            const updateMock = vi.fn().mockResolvedValue({ error: null });
            mockServiceRole.from('oauth_pending_requests').update = vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }));

            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', redirectUri);
            url.searchParams.set('code_challenge', challenge);
            url.searchParams.set('code_challenge_method', 'S256');

            const request = createMockRequest(url.toString());

            await GET(request);

            expect(mockServiceRole.from('oauth_pending_requests').update).toHaveBeenCalled();
        });
    });

    describe('Parameter Validation', () => {
        it('should reject missing client_id', async () => {
            const { challenge } = generatePKCEPair();

            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('redirect_uri', redirectUri);
            url.searchParams.set('code_challenge', challenge);

            const request = createMockRequest(url.toString());
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('invalid_request');
            expect(data.error_description).toContain('client_id');
        });

        it('should reject missing redirect_uri', async () => {
            const { challenge } = generatePKCEPair();

            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('code_challenge', challenge);

            const request = createMockRequest(url.toString());
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('invalid_request');
            expect(data.error_description).toContain('redirect_uri');
        });

        it('should reject missing code_challenge', async () => {
            const url = new URL('/api/oauth/authorize', baseUrl);
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', redirectUri);

            const request = createMockRequest(url.toString());
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('invalid_request');
            expect(data.error_description).toContain('code_challenge');
        });
    });

    describe('Concurrent Requests', () => {
        it('should handle multiple concurrent authorization requests', async () => {
            const challenges = Array.from({ length: 3 }, () => generatePKCEPair().challenge);

            const user = createMockUser();
            const session = createMockSession();
            const mockSupabase = createMockSupabaseClient(user, session);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabase as any);

            const mockServiceRole = createMockServiceRoleClient();
            mockServiceRole.from('oauth_pending_requests').select = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').eq = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').gt = vi.fn().mockReturnThis();
            mockServiceRole.from('oauth_pending_requests').maybeSingle = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            });
            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            const requests = challenges.map((challenge) => {
                const url = new URL('/api/oauth/authorize', baseUrl);
                url.searchParams.set('client_id', clientId);
                url.searchParams.set('redirect_uri', redirectUri);
                url.searchParams.set('code_challenge', challenge);
                url.searchParams.set('code_challenge_method', 'S256');
                return createMockRequest(url.toString());
            });

            const responses = await Promise.all(requests.map((req) => GET(req)));

            // All should succeed
            responses.forEach((response) => {
                expect(response.status).toBe(302);
            });

            // All should have different codes
            const codes = responses.map((response) => {
                const location = response.headers.get('location');
                if (location) {
                    const url = new URL(location);
                    return url.searchParams.get('code');
                }
                return null;
            }).filter(Boolean);

            expect(codes.length).toBe(3);
            expect(new Set(codes).size).toBe(3); // All codes should be unique
        });
    });
});

