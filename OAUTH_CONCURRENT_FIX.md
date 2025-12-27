# Critical Fix: Full Authorization Code Storage

## Problem Identified

When Cursor made concurrent OAuth requests with different PKCE challenges, the flow was:

1. ✅ Pending request stored in `oauth_pending_requests` table
2. ✅ User authenticates
3. ❌ Authorization code stored in DB but was incomplete (only the simple "userid-timestamp-random" part)
4. ❌ Token endpoint retrieved incomplete code, couldn't decode the challenge
5. ❌ PKCE verification failed: "Code verifier does not match code challenge"

## Root Cause

The authorization endpoint was:

1. Generating a simple auth code: `authCode = "userid-timestamp-random"`
2. Storing this simple code in the DB as `authorization_code`
3. Later encoding it with session data: `finalCode = authCode.base64url(codeData)`
4. Returning `finalCode` to client

But the token endpoint would:

1. Retrieve the simple code from DB
2. Use it directly, without the encoded session data
3. Try to decode it, which would fail because it had no `codeChallenge` info

## Solution

Now the full encoded code is stored in the database:

### Authorize Endpoint (NEW FLOW)

```typescript
// 1. Create full code data with challenge, tokens, etc.
const codeData = {
  userId: user.id,
  codeChallenge, // ✅ Includes the challenge
  codeChallengeMethod: "S256",
  scope: scope,
  redirectUri,
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  expiresAt: Date.now() + 10 * 60 * 1000,
};

// 2. Encode everything
const encodedCode = Buffer.from(JSON.stringify(codeData)).toString("base64url");
const finalCode = `${authCode}.${encodedCode}`; // ← Full code

// 3. Store FULL code in database
await serviceRoleClient
  .from("oauth_pending_requests")
  .update({
    user_id: user.id,
    authorization_code: finalCode, // ← Now stores complete code
  })
  .eq("id", pending.id);

// 4. Return the full code to client
redirectUrl.searchParams.set("code", finalCode);
```

### Token Endpoint (UNCHANGED USAGE)

```typescript
// 1. Lookup pending request by computed challenge
const { data: pending } = await serviceRoleClient
  .from("oauth_pending_requests")
  .select("*")
  .eq("code_challenge", computedChallenge)
  .maybeSingle();

// 2. Get full code from pending request
if (pending && pending.authorization_code) {
  code = pending.authorization_code; // ← Now has all data
}

// 3. Decode the code (now has all metadata)
const codeParts = code.split(".");
const codeData = JSON.parse(Buffer.from(codeParts[1], "base64url").toString());

// 4. PKCE verification now works ✅
const computedChallenge = createHash("sha256")
  .update(code_verifier)
  .digest("base64url");

if (computedChallenge !== codeData.codeChallenge) {
  // This check now passes because codeData has the challenge
}
```

## Files Modified

- `apps/web/src/app/api/oauth/authorize/route.ts` - Store full encoded code in DB
- `apps/web/src/app/api/oauth/token/route.ts` - Enhanced logging for debugging

## Testing the Fix

1. Cursor makes 2 concurrent auth requests with different challenges
2. Both pending requests stored with their unique challenges
3. User authenticates once
4. Each pending request gets its own full authorization code (with its challenge)
5. Cursor exchanges each code with its matching code_verifier
6. PKCE verification succeeds because code contains the matching challenge
7. Each pending request deleted after single use

## Security Implications

✅ **Single-use enforcement**: Each code can only be exchanged once (pending row deleted)
✅ **PKCE still enforced**: Each code includes its code_challenge
✅ **No shared state**: Each concurrent request gets its own code and challenge
✅ **Automatic expiration**: Codes expire in 10 minutes
✅ **Database isolation**: RLS policies still enforce proper access

## Why This Works for Concurrent Requests

Before fix:

```
Request 1 (challenge_1) → Pending request stored
Request 2 (challenge_2) → Pending request stored
User authenticates → Both get SIMPLE codes (no challenge data)
Exchange with verifier_1 → code has NO challenge info → FAILS
```

After fix:

```
Request 1 (challenge_1) → Pending request stored
Request 2 (challenge_2) → Pending request stored
User authenticates → Each gets FULL code WITH its challenge
Exchange with verifier_1 → code has challenge_1 → SUCCEEDS
Exchange with verifier_2 → code has challenge_2 → SUCCEEDS
```

## Backward Compatibility

✅ No API changes
✅ No database schema changes
✅ Just storing complete data instead of partial data
✅ Token exchange logic unchanged (it gets better data now)

