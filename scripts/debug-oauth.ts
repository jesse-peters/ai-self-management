/**
 * Debug script to query oauth_pending_requests table
 * 
 * Usage:
 *   pnpm tsx scripts/debug-oauth.ts
 * 
 * This script queries the Supabase database to show:
 * - All pending OAuth requests
 * - Their code challenges
 * - Whether they have authorization codes
 * - When they expire
 */

import { createServiceRoleClient } from '../packages/db/src/client';

async function debugOAuthPendingRequests() {
    console.log('🔍 Querying oauth_pending_requests table...\n');

    try {
        const supabase = createServiceRoleClient();

        // Query all pending requests
        const { data: pendingRequests, error } = await supabase
            .from('oauth_pending_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('❌ Error querying database:', error.message);
            process.exit(1);
        }

        if (!pendingRequests || pendingRequests.length === 0) {
            console.log('✅ No pending requests found in database');
            return;
        }

        console.log(`📊 Found ${pendingRequests.length} pending request(s):\n`);

        const now = new Date();

        for (const request of pendingRequests) {
            const expiresAt = new Date((request as any).expires_at);
            const isExpired = expiresAt < now;
            const hasCode = !!(request as any).authorization_code;
            const codeLength = (request as any).authorization_code?.length || 0;

            console.log('─'.repeat(80));
            console.log(`ID: ${(request as any).id}`);
            console.log(`Client ID: ${(request as any).client_id}`);
            console.log(`Code Challenge: ${(request as any).code_challenge}`);
            console.log(`  Length: ${(request as any).code_challenge?.length}`);
            console.log(`Challenge Method: ${(request as any).code_challenge_method}`);
            console.log(`Redirect URI: ${(request as any).redirect_uri}`);
            console.log(`State: ${(request as any).state || '(none)'}`);
            console.log(`Scope: ${(request as any).scope || '(none)'}`);
            console.log(`User ID: ${(request as any).user_id || '(not authenticated)'}`);
            console.log(`Has Authorization Code: ${hasCode ? '✅ YES' : '❌ NO'}`);

            if (hasCode) {
                const code = (request as any).authorization_code;
                const codePreview = code.substring(0, 100) + '...';
                console.log(`  Code Length: ${codeLength} characters`);
                console.log(`  Code Preview: ${codePreview}`);

                // Try to decode the code to show what challenge is inside
                try {
                    const codeParts = code.split('.');
                    if (codeParts.length >= 2) {
                        const encodedData = codeParts[1];
                        const decodedData = Buffer.from(encodedData, 'base64url').toString();
                        const codeData = JSON.parse(decodedData);
                        console.log(`  Challenge in Code: ${codeData.codeChallenge || '(missing)'}`);
                        console.log(`  Challenge Match: ${codeData.codeChallenge === (request as any).code_challenge ? '✅ YES' : '❌ NO'}`);
                        console.log(`  User ID in Code: ${codeData.userId || '(missing)'}`);
                        console.log(`  Expires At: ${new Date(codeData.expiresAt).toISOString()}`);
                    }
                } catch (decodeError) {
                    console.log(`  ⚠️  Could not decode code: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`);
                }
            }

            console.log(`Created At: ${new Date((request as any).created_at).toISOString()}`);
            console.log(`Expires At: ${expiresAt.toISOString()}`);
            console.log(`Status: ${isExpired ? '⏰ EXPIRED' : '⏳ ACTIVE'}`);
            console.log('');
        }

        console.log('─'.repeat(80));
        console.log('\n💡 Tips:');
        console.log('  - Active requests are those that haven\'t expired yet');
        console.log('  - Requests with authorization codes have been processed after user auth');
        console.log('  - Challenge in code should match the stored code_challenge');
        console.log('  - Expired requests should be cleaned up automatically\n');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

// Run the debug script
debugOAuthPendingRequests().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});


