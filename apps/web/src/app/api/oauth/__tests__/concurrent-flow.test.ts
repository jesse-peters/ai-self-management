/**
 * Concurrent OAuth flow tests
 * Tests request deduplication pattern where concurrent requests update the same pending request
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as AuthorizeGET } from '../authorize/route';
import { POST as TokenPOST } from '../token/route';
import { createMockRequest, createMockUser, createMockSession, createMockSupabaseClient, createMockServiceRoleClient } from '@/__tests__/helpers/mocks';
import { generatePKCEPair } from '@/__tests__/helpers/pkce';
import * as supabaseClientModule from '@/lib/supabaseClient';
import * as dbModule from '@projectflow/db';

// Mock dependencies
vi.mock('@/lib/supabaseClient');
vi.mock('@projectflow/db');
vi.mock('@/lib/logger');
vi.mock('@/lib/correlationId');

describe('Concurrent OAuth Flow (Request Deduplication)', () => {
    const baseUrl = 'http://localhost:3000';
    const clientId = 'test-client-id';
    const redirectUri = 'cursor://oauth-callback';
    const scope = 'projects tasks';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Request Deduplication', () => {
        it('should update existing pending request when concurrent requests arrive (latest wins)', async () => {
            // Create 3 PKCE pairs for concurrent requests
            const pkce1 = generatePKCEPair();
            const pkce2 = generatePKCEPair();
            const pkce3 = generatePKCEPair();

            const mockSupabaseUnauth = createMockSupabaseClient(null, null);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabaseUnauth as any);

            const mockServiceRole = createMockServiceRoleClient();
            const insertCalls: any[] = [];
            const updateCalls: any[] = [];
            let existingPending: any = null;

            // Mock lookup: first request finds nothing, subsequent requests find the existing one
            let lookupCallCount = 0;
            mockServiceRole.from = vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gt: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn(() => {
                    lookupCallCount++;
                    if (lookupCallCount === 1) {
                        // First request: no existing pending request
                        return Promise.resolve({ data: null, error: null });
                    } else {
                        // Subsequent requests: return the existing pending request
                        return Promise.resolve({ data: existingPending, error: null });
                    }
                }),
                insert: vi.fn((data: any) => {
                    insertCalls.push(data);
                    // Create the pending request that will be found by subsequent requests
                    existingPending = {
                        id: 'pending-1',
                        ...data,
                        status: 'pending',
                    };
                    return Promise.resolve({ error: null });
                }),
                update: vi.fn((data: any) => {
                    updateCalls.push({ ...data });
                    // Update the existing pending request
                    if (existingPending) {
                        existingPending = { ...existingPending, ...data };
                    }
                    return {
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    };
                }),
            }));

            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            // Make 3 concurrent authorization requests
            const requests = [pkce1, pkce2, pkce3].map((pkce) => {
                const authorizeUrl = new URL('/api/oauth/authorize', baseUrl);
                authorizeUrl.searchParams.set('client_id', clientId);
                authorizeUrl.searchParams.set('redirect_uri', redirectUri);
                authorizeUrl.searchParams.set('code_challenge', pkce.challenge);
                authorizeUrl.searchParams.set('code_challenge_method', 'S256');
                authorizeUrl.searchParams.set('scope', scope);

                return {
                    request: createMockRequest(authorizeUrl.toString(), {
                        headers: { 'user-agent': 'Cursor/1.0' },
                    }),
                    pkce,
                };
            });

            // Execute all requests
            const responses = await Promise.all(
                requests.map(({ request }) => AuthorizeGET(request))
            );

            // All should return authorization_pending
            responses.forEach((response) => {
                expect(response.status).toBe(401);
            });

            // First request should insert, subsequent requests should update
            expect(insertCalls.length).toBe(1);
            expect(insertCalls[0].code_challenge).toBe(pkce1.challenge);
            expect(updateCalls.length).toBe(2);
            // Last update should have the last challenge (pkce3)
            expect(updateCalls[updateCalls.length - 1].code_challenge).toBe(pkce3.challenge);
        });

        it('should generate ONE authorization code using the latest challenge when user authenticates', async () => {
            const user = createMockUser();
            const session = createMockSession();

            // Create 3 PKCE pairs - the last one (pkce3) should be used
            const pkce1 = generatePKCEPair();
            const pkce2 = generatePKCEPair();
            const pkce3 = generatePKCEPair();

            // Mock authenticated user
            const mockSupabaseAuth = createMockSupabaseClient(user, session);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabaseAuth as any);

            // Mock THE SINGLE pending request (deduplication ensures only one exists)
            // It should have the latest challenge (pkce3)
            const pendingRequest = {
                id: 'pending-1',
                client_id: clientId,
                code_challenge: pkce3.challenge, // Latest challenge wins
                code_challenge_method: 'S256',
                redirect_uri: redirectUri,
                state: null,
                scope: scope,
                user_id: null,
                authorization_code: null,
                status: 'pending',
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            };

            const mockServiceRole = createMockServiceRoleClient();
            const updateCalls: any[] = [];

            mockServiceRole.from = vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gt: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: pendingRequest, error: null }),
                update: vi.fn((data: any) => {
                    updateCalls.push(data);
                    return {
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    };
                }),
            }));

            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            // User authenticates
            const authorizeUrl = new URL('/api/oauth/authorize', baseUrl);
            authorizeUrl.searchParams.set('client_id', clientId);
            authorizeUrl.searchParams.set('redirect_uri', redirectUri);
            authorizeUrl.searchParams.set('code_challenge', pkce1.challenge); // This doesn't matter - pending request has pkce3
            authorizeUrl.searchParams.set('code_challenge_method', 'S256');
            authorizeUrl.searchParams.set('scope', scope);

            const authorizeRequest = createMockRequest(authorizeUrl.toString(), {
                headers: { 'user-agent': 'Mozilla/5.0' },
            });

            const authorizeResponse = await AuthorizeGET(authorizeRequest);

            // Should redirect successfully
            expect(authorizeResponse.status).toBe(307); // Redirect

            // Should have updated THE SINGLE pending request with ONE code
            expect(updateCalls.length).toBe(1);
            expect(updateCalls[0].user_id).toBe(user.id);
            expect(updateCalls[0].status).toBe('authorized');
            expect(updateCalls[0].authorization_code).toBeTruthy();

            // Verify the code contains the latest challenge (pkce3)
            const codeParts = updateCalls[0].authorization_code.split('.');
            expect(codeParts.length).toBe(2);
            const decodedData = JSON.parse(Buffer.from(codeParts[1], 'base64url').toString());
            expect(decodedData.codeChallenge).toBe(pkce3.challenge);
        });

        it('should successfully exchange code with matching verifier (latest challenge)', async () => {
            const user = createMockUser();
            const session = createMockSession();

            // Create PKCE pair - this is the latest one that will be used
            const pkceLatest = generatePKCEPair();

            // Create authorization code with the latest challenge
            const authCode = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const codeData = {
                userId: user.id,
                codeChallenge: pkceLatest.challenge,
                codeChallengeMethod: 'S256',
                scope,
                redirectUri,
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                expiresAt: Date.now() + 10 * 60 * 1000,
            };
            const encodedCode = Buffer.from(JSON.stringify(codeData)).toString('base64url');
            const finalCode = `${authCode}.${encodedCode}`;

            const mockSupabaseAuth = createMockSupabaseClient(user, session);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabaseAuth as any);

            // Mock pending request lookup by authorization_code
            const mockServiceRole = createMockServiceRoleClient();
            const deleteCalls: string[] = [];

            mockServiceRole.from = vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gt: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                        id: 'pending-1',
                        status: 'authorized',
                    },
                    error: null,
                }),
                delete: vi.fn(() => {
                    return {
                        eq: vi.fn((id: string) => {
                            deleteCalls.push(id);
                            return Promise.resolve({ error: null });
                        }),
                    };
                }),
            }));

            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            // Exchange code with matching verifier
            const tokenRequest = createMockRequest('/api/oauth/token', {
                method: 'POST',
                body: {
                    grant_type: 'authorization_code',
                    code: finalCode,
                    redirect_uri: redirectUri,
                    code_verifier: pkceLatest.verifier, // Matches the latest challenge
                },
            });

            const tokenResponse = await TokenPOST(tokenRequest);
            const tokenData = await tokenResponse.json();

            // Should succeed
            expect(tokenResponse.status).toBe(200);
            expect(tokenData.access_token).toBe(session.access_token);
            expect(tokenData.refresh_token).toBe(session.refresh_token);

            // Should have deleted the pending request (single-use enforcement)
            expect(deleteCalls.length).toBe(1);
            expect(deleteCalls[0]).toBe('pending-1');
        });

        it('should fail PKCE verification if verifier does not match latest challenge', async () => {
            const user = createMockUser();
            const session = createMockSession();

            // Create two PKCE pairs - one used for code, one used for verifier (mismatch)
            const pkceForCode = generatePKCEPair();
            const pkceForVerifier = generatePKCEPair(); // Different pair - will fail

            // Create authorization code with pkceForCode challenge
            const authCode = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const codeData = {
                userId: user.id,
                codeChallenge: pkceForCode.challenge, // Code has this challenge
                codeChallengeMethod: 'S256',
                scope,
                redirectUri,
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                expiresAt: Date.now() + 10 * 60 * 1000,
            };
            const encodedCode = Buffer.from(JSON.stringify(codeData)).toString('base64url');
            const finalCode = `${authCode}.${encodedCode}`;

            const mockSupabaseAuth = createMockSupabaseClient(user, session);
            vi.spyOn(supabaseClientModule, 'createServerClient').mockResolvedValue(mockSupabaseAuth as any);

            const mockServiceRole = createMockServiceRoleClient();
            mockServiceRole.from = vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gt: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }));

            vi.spyOn(dbModule, 'createServiceRoleClient').mockReturnValue(mockServiceRole as any);

            // Exchange code with WRONG verifier (from different PKCE pair)
            const tokenRequest = createMockRequest('/api/oauth/token', {
                method: 'POST',
                body: {
                    grant_type: 'authorization_code',
                    code: finalCode,
                    redirect_uri: redirectUri,
                    code_verifier: pkceForVerifier.verifier, // Wrong verifier - doesn't match code challenge
                },
            });

            const tokenResponse = await TokenPOST(tokenRequest);
            const tokenData = await tokenResponse.json();

            // Should fail with PKCE verification error
            expect(tokenResponse.status).toBe(400);
            expect(tokenData.error).toBe('invalid_grant');
            expect(tokenData.error_description).toContain('Code verifier does not match code challenge');
        });
    });
});
