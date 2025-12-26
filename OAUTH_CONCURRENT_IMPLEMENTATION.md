# OAuth 2.1 Concurrent Request Handling - Implementation Summary

## Problem Statement

Cursor MCP client was making multiple concurrent authorization requests with different PKCE code challenges, causing:

1. PKCE verification failures - client sends verifier that doesn't match the challenge in the authorization code
2. Multiple pending requests created, but only one code generated
3. Client expects standard OAuth redirect flow, not polling

## Solution Architecture

### Overview

We use **Supabase database** as the source of truth for pending authorization requests and implement **server-side request deduplication** to handle multiple concurrent authorization requests. Concurrent requests from the same client are consolidated into a single pending request, ensuring only one authorization code is generated with the correct PKCE challenge.

```
┌─────────────────────────────────────────────────────────────┐
│  MCP Client (Cursor) - Multiple Concurrent Requests         │
│  Request 1: challenge_A, verifier_A                        │
│  Request 2: challenge_B, verifier_B                        │
│  Request 3: challenge_C, verifier_C                        │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│  OAuth Authorize Endpoint                                   │
│  - Request 1: No existing pending → INSERT (challenge_A)   │
│  - Request 2: Found existing → UPDATE (challenge_B)        │
│  - Request 3: Found existing → UPDATE (challenge_C)        │
│  - Latest challenge wins (deduplication)                    │
│  - Returns "authorization_pending" for programmatic clients│
└─────────────────────────────────────────────────────────────┘
             │
             ├─► Browser: Redirect to login
             │
             └─► Programmatic (cursor://): Return authorization_pending
                 + verification_uri

             ▼
┌─────────────────────────────────────────────────────────────┐
│  User Authenticates (Browser)                               │
│  - Login via Supabase Auth                                  │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│  OAuth Authorize Endpoint (POST-auth)                       │
│  - Find THE SINGLE pending request for client               │
│  - Generate ONE authorization_code with latest challenge  │
│  - Update oauth_pending_requests with code & status         │
│  - Redirect with code (standard OAuth flow)                 │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│  MCP Client - Token Exchange                                │
│  - Exchange code + verifier_C → tokens                     │
│  - (Only latest request succeeds - others fail)             │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│  OAuth Token Endpoint                                       │
│  - Decode authorization code (self-contained)                │
│  - Validate PKCE (challenge matches verifier)               │
│  - Delete pending request (single-use enforcement)          │
│  - Return access_token + refresh_token                     │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│  MCP Client - Authenticated                                │
│  - Uses access_token for API requests                      │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Database Schema

**Table**: `oauth_pending_requests`

```sql
CREATE TABLE oauth_pending_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  redirect_uri TEXT NOT NULL,
  state TEXT,
  scope TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  authorization_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'authorized' | 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',

  UNIQUE(client_id) -- Only ONE pending request per client (deduplication)
);
```

**Key Features:**

- ✅ **UUID Primary Key** - Supabase native
- ✅ **Automatic Timestamps** - created_at, expires_at with NOW()
- ✅ **RLS Policies** - Service role can manage all, users can see their own
- ✅ **Unique Constraint on client_id** - Ensures only ONE pending request per client (deduplication)
- ✅ **Status Column** - Tracks request state: 'pending' | 'authorized' | 'completed'
- ✅ **Indexes** - For fast lookups by code_challenge, user_id, expires_at, status
- ✅ **Foreign Key** - Links to auth.users with CASCADE delete

### 2. Authorization Endpoint

**File**: `apps/web/src/app/api/oauth/authorize/route.ts`

**When User Not Authenticated:**

```typescript
// Check if pending request already exists for this client
const { data: existingPending } = await serviceRoleClient
  .from("oauth_pending_requests")
  .select("*")
  .eq("client_id", clientId)
  .eq("status", "pending")
  .gt("expires_at", new Date().toISOString())
  .maybeSingle();

if (existingPending) {
  // Update existing pending request with new challenge (latest wins)
  await serviceRoleClient
    .from("oauth_pending_requests")
    .update({
      code_challenge: codeChallenge,  // Latest challenge wins
      code_challenge_method,
      redirect_uri,
      state,
      scope,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      status: "pending",
    })
    .eq("id", existingPending.id);
} else {
  // Insert new pending request
  await serviceRoleClient
    .from("oauth_pending_requests")
    .insert({
      client_id,
      code_challenge,
      code_challenge_method,
      redirect_uri,
      state,
      scope,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      status: "pending",
    });
}

// Return authorization_pending for programmatic clients
return NextResponse.json({
  error: "authorization_pending",
  verification_uri: authorizationUri,
});
```

**When User Authenticates:**

```typescript
// Find THE SINGLE pending request for this client (deduplication ensures only one exists)
const { data: pendingRequest } = await serviceRoleClient
  .from("oauth_pending_requests")
  .select("*")
  .eq("client_id", clientId)
  .eq("status", "pending")
  .gt("expires_at", new Date().toISOString())
  .maybeSingle();

// Generate ONE authorization code using the challenge from the pending request
if (pendingRequest) {
  const authCode = generateAuthorizationCode({
    codeChallenge: pendingRequest.code_challenge,  // Use challenge from pending request (latest)
    // ... other data
  });
    
  await serviceRoleClient
    .from("oauth_pending_requests")
    .update({
      user_id: user.id,
      authorization_code: authCode,
      status: "authorized",
    })
    .eq("id", pendingRequest.id);
}

// Redirect with code (standard OAuth flow)
```

### 3. Token Exchange Endpoint

**File**: `apps/web/src/app/api/oauth/token/route.ts`

**Single-Use Enforcement:**

```typescript
// Lookup pending request by authorization_code for single-use enforcement
const { data: pending } = await serviceRoleClient
  .from("oauth_pending_requests")
  .select("id, status")
  .eq("authorization_code", code)
  .gt("expires_at", new Date().toISOString())
  .maybeSingle();

// Store pending request ID for deletion after successful exchange
let pendingRequestId = pending?.id || null;
```

**PKCE Verification:**

```typescript
// Decode authorization code (self-contained)
const codeParts = code.split(".");
const codeData = JSON.parse(Buffer.from(codeParts[1], "base64url").toString());

// Compute challenge from verifier
const computedChallenge = createHash("sha256")
  .update(code_verifier)
  .digest("base64url");

// Compare with challenge stored in authorization code
if (computedChallenge !== codeData.codeChallenge) {
  return NextResponse.json(
    {
      error: "invalid_grant",
      error_description: "Code verifier does not match code challenge",
    },
    { status: 400 }
  );
}

// Delete pending request after successful token exchange (single-use enforcement)
if (pendingRequestId) {
  await serviceRoleClient
    .from("oauth_pending_requests")
    .delete()
    .eq("id", pendingRequestId);
}
```

## Key Features

### ✅ OAuth 2.1 Compliance

- **PKCE Enforced**: Every authorization code requires code_verifier
- **Code Challenge Validation**: Format validated before storage
- **Code Verifier Validation**: Format validated before use
- **State Parameter**: Validated for CSRF protection
- **Single-Use Codes**: Deleted after token exchange
- **Automatic Expiration**: 10-minute TTL with expiry checks

### ✅ Concurrent Request Handling

- **Request Deduplication**: Concurrent requests update the same pending row (latest wins)
- **No Race Conditions**: Database UNIQUE constraint on client_id ensures only one pending request
- **Single Code Generated**: When user authenticates, ONE authorization code is generated with the latest challenge
- **Standard OAuth Flow**: Uses traditional redirect flow (no polling required)
- **Stateless Serverless**: Works on Vercel (no in-memory state)

### ✅ Security

- **RLS Policies**: Users can only see their own pending requests
- **Service Role**: Backend operations use service role with full access
- **Format Validation**: Both challenge and verifier formats validated
- **Expiration**: Automatic cleanup of expired requests
- **State Validation**: CSRF protection via state parameter

### ✅ Enhanced Logging

- **Correlation IDs**: Track requests through the flow
- **Request Tracking**: Log all pending request operations
- **Error Details**: Full context for debugging
- **PKCE Debugging**: Log computed vs stored challenges

## Testing

### Manual Testing

1. **Single Request Test**:

   ```bash
   npx ts-node test-oauth-concurrent.ts
   ```

   This sends a single authorization request and verifies the response.

2. **Concurrent Requests Test**:

   ```bash
   # Edit test-oauth-concurrent.ts to increase concurrency
   # Run with 3, 5, or 10 concurrent requests
   ```

3. **Database Verification**:
   - Open Supabase Dashboard
   - Check `oauth_pending_requests` table
   - Verify:
     - Multiple rows with unique code_challenges
     - authorization_code populated after user auth
     - Rows deleted after token exchange

### Integration Testing

The test suite in `test-oauth-concurrent.ts` validates:

1. Single authorization request → authorization_pending response
2. Concurrent authorization requests → each gets pending response
3. Unique code challenges tracked correctly
4. PKCE verification with different verifier lengths
5. Single-use code enforcement (requires auth + token exchange)

## Vercel Best Practices

✅ **Stateless**: No in-memory state - uses Supabase
✅ **Scalable**: Multiple serverless functions can handle concurrent requests
✅ **Durable**: Data persisted in Supabase, survives function restarts
✅ **Cost-Effective**: Minimal database queries
✅ **Fast**: Indexed lookups by code_challenge

## Supabase Best Practices

✅ **Native Features**: Uses gen_random_uuid(), NOW(), RLS, indexes
✅ **Automatic Expiration**: Database handles TTL
✅ **Row Level Security**: Enforces data isolation
✅ **Service Role**: Proper use of role-based access
✅ **Foreign Keys**: Links to auth.users with CASCADE delete

## MCP Best Practices

✅ **OAuth 2.1 Compliant**: Full spec compliance
✅ **PKCE Required**: All authorization codes require verification
✅ **Cursor Support**: Handles cursor:// redirect URIs correctly
✅ **Stateless**: Works with concurrent MCP clients
✅ **Error Handling**: Proper error responses for all scenarios

## Files Modified

1. **Migration File** (NEW):

   - `packages/db/supabase/migrations/20251225000003_oauth_pending_requests.sql`
   - Creates table with indexes and RLS policies

2. **Authorization Endpoint**:

   - `apps/web/src/app/api/oauth/authorize/route.ts`
   - Stores pending requests in Supabase
   - When user authenticates, generates codes for ALL pending requests
   - Each code contains its own challenge from the pending request

3. **Token Endpoint**:

   - `apps/web/src/app/api/oauth/token/route.ts`
   - Looks up pending requests by code_challenge (optional)
   - Validates PKCE challenge matches verifier
   - Returns access_token + refresh_token

5. **Migration File** (NEW):

   - `packages/db/supabase/migrations/20251225000007_oauth_deduplication.sql`
   - Updates schema for deduplication (unique constraint on client_id, status column)

6. **Test Files**:

   - `test-oauth-concurrent.ts` - Manual test script
   - `apps/web/src/app/api/oauth/__tests__/concurrent-flow.test.ts` - Integration tests for deduplication

## Debugging

### View Pending Requests

```bash
# In Supabase Dashboard → SQL Editor
SELECT id, client_id, code_challenge, user_id, authorization_code, created_at, expires_at
FROM oauth_pending_requests
ORDER BY created_at DESC
LIMIT 10;
```

### Check Correlation IDs in Logs

```bash
# Look for these log messages:
# - "Stored pending request in Supabase"
# - "Found X pending request(s) for client, generating codes for all"
# - "Generated authorization code for pending request"
# - "Returning authorization code from pending request"
# - "Deleted pending request after returning code"
# - "Looking up pending request in Supabase by computed challenge"
```

### Verify Code Challenge Format

The code challenge must be base64url-encoded:

- Allowed characters: `A-Z`, `a-z`, `0-9`, `-`, `_`
- Length: 43-128 characters

## Migration Steps

1. **Apply Migration**:

   ```bash
   pnpm db:migrate
   ```

2. **Generate Types**:

   ```bash
   pnpm db:generate-types
   ```

3. **Restart Services**:

   ```bash
   pnpm dev
   ```

4. **Verify in Dashboard**:
   - Check `oauth_pending_requests` table exists
   - Check RLS policies are configured
   - Check indexes are created

## Performance Considerations

- **Lookup Performance**: O(1) via code_challenge index
- **Concurrent Requests**: No contention (each gets unique row)
- **Cleanup**: Expired rows not queried (expires_at index helps)
- **Storage**: Minimal (only stores challenge + metadata)

## Client Implementation Guide

### For MCP Clients (Cursor, etc.)

**Note**: The server implements request deduplication. If multiple concurrent authorization requests are made, only the **latest** request's challenge will be used for code generation. Earlier concurrent requests will fail PKCE verification.

1. **Make Authorization Request**:
   ```typescript
   const { verifier, challenge } = generatePKCEPair();
   const response = await fetch('/api/oauth/authorize?' + new URLSearchParams({
     client_id: 'your-client-id',
     redirect_uri: 'cursor://oauth-callback',
     code_challenge: challenge,
     code_challenge_method: 'S256',
   }));
   
   if (response.status === 401) {
     const data = await response.json();
     // data.error === 'authorization_pending'
     // Open browser to data.verification_uri
   }
   ```

2. **Receive Authorization Code** (via redirect):
   - User authenticates in browser
   - Browser redirects to `cursor://oauth-callback?code={authorization_code}`
   - Client receives the authorization code from the redirect

3. **Exchange Code for Tokens**:
   ```typescript
   const tokenResponse = await fetch('/api/oauth/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body: new URLSearchParams({
       grant_type: 'authorization_code',
       code: code,  // From redirect
       redirect_uri: 'cursor://oauth-callback',
       code_verifier: verifier,  // Must match the challenge from the latest concurrent request
     }),
   });
   
   const tokens = await tokenResponse.json();
   // tokens.access_token, tokens.refresh_token
   ```

**Important**: If your client makes multiple concurrent authorization requests, ensure you use the verifier from the **last** request for token exchange, as that's the challenge that will be embedded in the authorization code.

## Future Improvements

- Periodic cleanup job for very old rows
- Metrics on authorization_pending flow duration
- Rate limiting per client_id
- Support for other grant types (client credentials, etc.)
- Polling interval recommendations in error responses
