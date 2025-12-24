# OAuth Self-Contained Implementation - Testing Guide

## What Changed

The ProjectFlow MCP server now uses a **self-contained OAuth 2.1 implementation** instead of proxying to Supabase's OAuth server. This provides:

- Full control over the OAuth flow
- No dependency on Supabase OAuth (which may not be enabled)
- Better debugging capabilities
- Direct integration with our database

## Architecture

```
┌─────────────┐
│   Cursor    │
│ MCP Client  │
└──────┬──────┘
       │
       │ 1. POST /api/mcp (no auth)
       │ ← 401 + WWW-Authenticate header
       │
       │ 2. GET /api/oauth/authorize
       │    with PKCE code_challenge
       ├──────────────────────────────┐
       │                              │
       ▼                              │
┌──────────────┐                      │
│ Check if     │                      │
│ user logged  │                      │
│ in           │                      │
└──────┬───────┘                      │
       │                              │
       │ If not logged in:           │
       │ → Redirect to /auth/login   │
       │                              │
       │ If logged in:               │
       │ → Generate auth code        │
       │ → Store in DB               │
       │                              │
       │ 3. Redirect to              │
       │    cursor://anysphere...    │
       │    with authorization code  │
       │                              │
       └──────────────┬───────────────┘
                      │
       ┌──────────────▼───────────────┐
       │ 4. POST /api/oauth/token     │
       │    grant_type=authorization_ │
       │    code                       │
       │    code=...                  │
       │    code_verifier=...         │
       └──────────────┬───────────────┘
                      │
       ┌──────────────▼───────────────┐
       │ - Validate auth code         │
       │ - Verify PKCE                │
       │ - Generate JWT access token  │
       │ - Generate refresh token     │
       │ - Store in oauth_tokens      │
       └──────────────┬───────────────┘
                      │
                      │ 5. Return tokens
                      │
       ┌──────────────▼───────────────┐
       │ Cursor stores tokens         │
       │ Uses Bearer token in future  │
       │ requests                      │
       └──────────────────────────────┘
```

## Files Modified

1. **`packages/core/src/services/oauth.ts`** - Added `verifyPKCE()` helper
2. **`apps/web/src/app/api/oauth/authorize/route.ts`** - Self-contained authorization endpoint
3. **`apps/web/src/app/api/oauth/token/route.ts`** - Self-contained token exchange
4. **`apps/web/src/app/api/oauth/callback/route.ts`** - Updated error messages (rarely used now)

## Database Tables Used

- **`oauth_authorization_codes`** - Stores authorization codes (10 min TTL)
  - `code` - The authorization code
  - `client_id` - OAuth client ID (e.g., "mcp-client")
  - `user_id` - User who authorized
  - `redirect_uri` - Where to redirect after authorization
  - `scope` - Granted scopes
  - `code_challenge` - PKCE challenge
  - `code_challenge_method` - PKCE method (S256)
  - `expires_at` - When code expires
  - `used_at` - When code was exchanged (prevents reuse)

- **`oauth_tokens`** - Stores refresh tokens and token metadata
  - `user_id` - Token owner
  - `access_token` - JWT access token (also stored)
  - `access_token_hash` - SHA256 hash for lookups
  - `refresh_token` - Opaque refresh token
  - `expires_at` - When access token expires
  - `scope` - Granted scopes
  - `client_id` - OAuth client ID

## Testing Steps

### 1. Prerequisites

Ensure you're logged in to the web app:
```bash
# Open browser and log in
open http://localhost:3000/auth/login
```

### 2. Restart Cursor MCP Connection

1. Open Cursor settings
2. Find the ProjectFlow MCP server
3. Disconnect and reconnect (or restart Cursor)

### 3. Expected Flow

You should see:

**In Cursor logs** (`anysphere.cursor-mcp.MCP user-ProjectFlow`):
```
[info] OAuth provider needs auth callback during connection
[info] Redirect to authorization requested
[info] Found 15 tools, 0 prompts, and 0 resources
```

**In server logs** (`@projectflow/web:dev`):
```
INFO: OAuth authorize request received
INFO: User authenticated
INFO: Authorization code generated and stored
INFO: Redirecting to callback with authorization code
INFO: OAuth token request received
INFO: Processing grant type: authorization_code
INFO: Authorization code verified, PKCE valid
INFO: OAuth token created successfully
```

### 4. Verify Authentication

After OAuth completes, try using MCP tools:

```
# In Cursor, ask AI to use ProjectFlow
"Create a new project called 'Test OAuth' using the projectflow MCP"
```

You should see:
- No more 401 errors
- Tool calls succeed
- Token persists across requests

### 5. Check Database

```sql
-- View authorization codes (should be empty after exchange)
SELECT * FROM oauth_authorization_codes;

-- View active tokens
SELECT 
  user_id,
  client_id,
  scope,
  expires_at,
  created_at,
  revoked_at
FROM oauth_tokens
ORDER BY created_at DESC
LIMIT 5;
```

## Troubleshooting

### Problem: Still getting 401 errors

**Check:**
1. Are you logged in to the web app? (`/auth/login`)
2. Does the database have the `oauth_authorization_codes` table?
3. Check server logs for errors during token exchange

**Solution:**
```bash
# Check if migration ran
cd /Users/jesse/Projects/personal/ai-project-management
npx supabase db diff

# If table is missing, run migrations
npx supabase db push
```

### Problem: "Authorization code expired"

**Cause:** Authorization codes expire after 10 minutes

**Solution:** Restart the OAuth flow (disconnect and reconnect MCP)

### Problem: "PKCE verification failed"

**Cause:** Mismatch between code_verifier and code_challenge

**Check:**
- Is the code_verifier being passed correctly?
- Check server logs for the PKCE verification details

### Problem: Cursor shows "No stored tokens found" repeatedly

**Cause:** Token exchange may be failing silently

**Check:**
1. Server logs for errors during POST to `/api/oauth/token`
2. Check if authorization code was successfully stored
3. Verify PKCE challenge was stored with the code

**Debug:**
```sql
-- Check if codes are being stored
SELECT 
  code,
  client_id,
  user_id,
  code_challenge,
  expires_at,
  used_at,
  created_at
FROM oauth_authorization_codes
ORDER BY created_at DESC
LIMIT 1;
```

### Problem: "Invalid authorization code"

**Causes:**
- Code already used (codes are one-time use)
- Code expired
- Code not found in database

**Solution:**
- Restart OAuth flow
- Check database for authorization codes
- Look at server logs for specific error

## Success Criteria

✅ OAuth flow completes without errors  
✅ Access token is generated and returned  
✅ Cursor stores the token  
✅ Subsequent MCP requests include `Authorization: Bearer <token>` header  
✅ MCP tool calls succeed (no 401 errors)  
✅ Token persists across requests  
✅ Refresh token works when access token expires  

## Next Steps

Once OAuth is working:

1. **Test token refresh** - Wait for access token to expire (1 hour) and verify refresh works
2. **Test token revocation** - Call `/api/oauth/revoke` and verify tokens are invalidated
3. **Test multiple clients** - Add another OAuth client and verify isolation
4. **Add logging cleanup** - Remove debug agent logs from authorize/token endpoints

## Key Differences from Supabase OAuth Proxy

| Aspect | Old (Supabase Proxy) | New (Self-Contained) |
|--------|---------------------|---------------------|
| Authorization code generation | Supabase | Our server |
| Code storage | Supabase | Our database |
| PKCE verification | Supabase | Our server |
| Token generation | Supabase (proxied) | Our server (JWT) |
| Token storage | Our database | Our database |
| Dependencies | Requires Supabase OAuth | None (self-contained) |
| Debugging | Limited visibility | Full control |
| Redirect flow | HTTP callback → deep link | Direct to deep link |

