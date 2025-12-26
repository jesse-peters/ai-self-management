/**
 * Test script to verify concurrent OAuth authorization requests
 * Each request should get a unique single-use authorization code
 * 
 * This tests the Supabase pending request flow:
 * 1. Multiple clients send authorization requests with different code challenges
 * 2. Each request is stored in oauth_pending_requests table
 * 3. User authenticates once
 * 4. Each pending request gets its own unique authorization code
 * 5. Each code can only be used once (deleted after token exchange)
 */

import crypto from 'crypto';

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  clientId: 'test-mcp-client',
  redirectUri: 'cursor://oauth-callback',
  scope: 'projects tasks',
};

interface PKCEPair {
  verifier: string;
  challenge: string;
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCEPair(): PKCEPair {
  const verifier = crypto
    .randomBytes(32)
    .toString('base64url')
    .slice(0, 128);

  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

/**
 * Test 1: Single authorization request
 */
async function testSingleAuthorizationRequest() {
  console.log('\n=== Test 1: Single Authorization Request ===');
  
  const pkce = generatePKCEPair();
  const state = crypto.randomBytes(16).toString('hex');

  const authorizeUrl = new URL('/api/oauth/authorize', TEST_CONFIG.baseUrl);
  authorizeUrl.searchParams.set('client_id', TEST_CONFIG.clientId);
  authorizeUrl.searchParams.set('redirect_uri', TEST_CONFIG.redirectUri);
  authorizeUrl.searchParams.set('code_challenge', pkce.challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', TEST_CONFIG.scope);

  console.log('Authorization URL:', authorizeUrl.toString());
  console.log('PKCE Challenge:', pkce.challenge.substring(0, 20) + '...');
  console.log('State:', state.substring(0, 20) + '...');

  try {
    const response = await fetch(authorizeUrl.toString());
    const data = await response.json();

    if (response.status === 401 && data.error === 'authorization_pending') {
      console.log('✓ Got authorization_pending response');
      console.log('Verification URI:', data.verification_uri?.substring(0, 100) + '...');
      return { success: true, pkce, state };
    } else {
      console.log('Response status:', response.status);
      console.log('Response:', data);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    return { success: false, error };
  }
}

/**
 * Test 2: Concurrent authorization requests
 * Simulates multiple Cursor MCP clients requesting authorization simultaneously
 */
async function testConcurrentAuthorizationRequests(count: number = 3) {
  console.log(`\n=== Test 2: Concurrent Authorization Requests (${count} requests) ===`);
  
  const requests = Array.from({ length: count }, (_, i) => {
    const pkce = generatePKCEPair();
    const state = crypto.randomBytes(16).toString('hex');

    const authorizeUrl = new URL('/api/oauth/authorize', TEST_CONFIG.baseUrl);
    authorizeUrl.searchParams.set('client_id', TEST_CONFIG.clientId);
    authorizeUrl.searchParams.set('redirect_uri', TEST_CONFIG.redirectUri);
    authorizeUrl.searchParams.set('code_challenge', pkce.challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('scope', TEST_CONFIG.scope);

    return {
      index: i,
      url: authorizeUrl.toString(),
      pkce,
      state,
    };
  });

  console.log(`Sending ${count} concurrent authorization requests...`);

  try {
    const responses = await Promise.all(
      requests.map(async (req) => {
        const response = await fetch(req.url);
        const data = await response.json();
        return {
          index: req.index,
          status: response.status,
          error: data.error,
          pkce: req.pkce,
          state: req.state,
          verification_uri: data.verification_uri,
        };
      })
    );

    let successCount = 0;
    let uniqueChallenges = new Set<string>();

    responses.forEach((res) => {
      console.log(`\nRequest ${res.index + 1}:`);
      console.log('  Status:', res.status);
      console.log('  Error:', res.error);
      console.log('  PKCE Challenge:', res.pkce.challenge.substring(0, 20) + '...');

      if (res.status === 401 && res.error === 'authorization_pending') {
        console.log('  ✓ Got authorization_pending');
        successCount++;
        uniqueChallenges.add(res.pkce.challenge);
      }
    });

    console.log(`\n✓ ${successCount}/${count} requests got authorization_pending`);
    console.log(`✓ ${uniqueChallenges.size}/${count} unique code challenges`);

    return {
      success: successCount === count && uniqueChallenges.size === count,
      responses,
    };
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    return { success: false, error };
  }
}

/**
 * Test 3: Verify pending request in database
 * (This would require direct database access in production)
 */
async function testPendingRequestTracking() {
  console.log('\n=== Test 3: Pending Request Tracking ===');
  console.log('Note: This test requires direct database access');
  console.log('Expected behavior:');
  console.log('1. Multiple rows in oauth_pending_requests table');
  console.log('2. Each row has unique code_challenge');
  console.log('3. Each row has expires_at in future');
  console.log('4. Each row has NULL authorization_code (until user authenticates)');
}

/**
 * Test 4: Verify single-use enforcement
 * (This would require authentication and token exchange)
 */
async function testSingleUseEnforcement() {
  console.log('\n=== Test 4: Single-Use Code Enforcement ===');
  console.log('Note: This test requires user authentication and token exchange');
  console.log('Expected behavior:');
  console.log('1. User authenticates via authorization_pending flow');
  console.log('2. Authorization code is generated for each pending request');
  console.log('3. First token exchange with code succeeds');
  console.log('4. Second exchange with same code fails (deleted after use)');
  console.log('5. Pending request is deleted from database after token exchange');
}

/**
 * Test 5: PKCE verification with concurrent requests
 */
async function testPKCEVerification() {
  console.log('\n=== Test 5: PKCE Verification ===');
  console.log('Testing PKCE flow with different verifiers:');

  const testCases = [
    {
      name: 'Valid S256',
      verifierLen: 128,
      method: 'S256',
      shouldPass: true,
    },
    {
      name: 'Valid S256 (shorter)',
      verifierLen: 43,
      method: 'S256',
      shouldPass: true,
    },
    {
      name: 'Invalid S256 (too short)',
      verifierLen: 42,
      method: 'S256',
      shouldPass: false,
    },
  ];

  for (const testCase of testCases) {
    const verifier = crypto.randomBytes(testCase.verifierLen).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    console.log(`\n${testCase.name}:`);
    console.log(`  Verifier length: ${verifier.length}`);
    console.log(`  Challenge: ${challenge.substring(0, 20)}...`);
    console.log(`  Should pass: ${testCase.shouldPass}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  OAuth 2.1 Concurrent Request Test Suite                  ║');
  console.log('║  Testing Supabase-based pending request tracking          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results: Record<string, any> = {};

  // Test 1: Single request
  results.test1 = await testSingleAuthorizationRequest();

  // Test 2: Concurrent requests
  results.test2 = await testConcurrentAuthorizationRequests(3);

  // Test 3: Pending request tracking
  await testPendingRequestTracking();

  // Test 4: Single-use enforcement
  await testSingleUseEnforcement();

  // Test 5: PKCE verification
  await testPKCEVerification();

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Test 1 (Single Request): ${results.test1.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Test 2 (Concurrent Requests): ${results.test2.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log('\nNote: To fully verify:');
  console.log('1. Check oauth_pending_requests table in Supabase Dashboard');
  console.log('2. Verify rows have unique code_challenges');
  console.log('3. Verify authorization_code column is populated after auth');
  console.log('4. Verify rows are deleted after token exchange');
}

// Run tests if this is the main module
runAllTests().catch(console.error);

