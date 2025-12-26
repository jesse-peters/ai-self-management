# OAuth PKCE Debug Logging Guide

## Overview

Extensive logging has been added to diagnose PKCE verification failures. This guide explains what logs to look for and how to use them.

## Logging Added

### 1. Authorization Endpoint (`/api/oauth/authorize`)

#### When User Not Authenticated:

- **"Stored pending request in Supabase with full challenge"**
  - Shows: `codeChallengeFull`, `codeChallengeLength`, `clientId`, `redirectUri`
  - Use this to verify challenges are being stored correctly

#### When User Authenticated:

- **"Found pending request in Supabase, storing full authorization code"**

  - Shows: `pendingId`, `storedChallenge`, `codeChallengeInCode`, `challengesMatch`
  - Verifies the challenge in the code matches the stored challenge

- **"Code details before storing in database"**

  - Shows: `codeDataChallenge`, `finalCodeLength`, `finalCodePreview`
  - Verifies what's being encoded in the code

- **"Updated pending request with full authorization code"**

  - Shows: `codeChallengeInStoredCode`, `storedChallengeInPending`, `finalCodePreview`
  - Confirms the full code is stored with the correct challenge

- **"Redirecting to callback page for cursor:// redirect"** or **"Redirecting to client with authorization code"**
  - Shows: `codePreview`, `codeChallengeInCode`
  - Verifies what code is being sent to the client

### 2. Token Endpoint (`/api/oauth/token`)

#### Initial Request:

- **"Processing authorization code grant - code received from client"**
  - Shows: `codePreview`, `codeVerifierPreview`
  - Shows what Cursor is sending

#### Database Lookup:

- **"Looking up pending request in Supabase"**

  - Shows: `computedChallengeFull`, `computedChallengeLength`
  - Shows the challenge computed from the verifier

- **"Found pending request with authorization code in Supabase - comparing codes"**

  - Shows: `codeFromRequestPreview`, `codeFromDBPreview`, `codesMatch`
  - Shows if the code from request matches the code in DB
  - Shows: `storedChallenge`, `computedChallengeForLookup`, `challengesMatch`
  - Verifies the lookup challenge matches the stored challenge

- **"Using authorization code for processing"**
  - Shows: `usingCodeFrom`, `finalCodePreview`
  - Shows which code is being used (request or DB)

#### Code Decoding:

- **"Decoded authorization code data - extracted challenge from code"**
  - Shows: `codeChallengeInCode`, `codeChallengeInCodeLength`
  - Shows what challenge is actually in the decoded code

#### PKCE Verification:

- **"Verifying PKCE code challenge - comparing computed vs stored"**

  - Shows:
    - `storedChallengeInCode` - Challenge from decoded code
    - `computedChallengeFromVerifier` - Challenge computed from verifier
    - `computedChallengeForLookup` - Challenge used for DB lookup
    - `lookupChallengeMatchesCodeChallenge` - Does lookup challenge match code challenge?
    - `computedChallengeMatchesCodeChallenge` - Does computed challenge match code challenge?
    - `challengesMatch` - Final match result
  - **This is the key log for diagnosing PKCE failures**

- **"PKCE code challenge verification failed"** (if mismatch)
  - Shows: `storedChallenge`, `computedChallenge`, `diffIndex`
  - Shows exactly where the challenges differ

## Debug Script

Run the debug script to see what's in the database:

```bash
pnpm tsx scripts/debug-oauth.ts
```

This shows:

- All pending requests
- Their code challenges
- Whether they have authorization codes
- What challenge is inside the code (if decodable)
- Whether the challenge in code matches the stored challenge
- Expiration status

## How to Diagnose PKCE Failures

### Step 1: Check Authorization Logs

Look for these logs when Cursor makes requests:

1. **"Stored pending request in Supabase with full challenge"**

   - Note the `codeChallengeFull` value
   - This is what Cursor sent

2. **"Updated pending request with full authorization code"**
   - Check `codeChallengeInStoredCode` matches `storedChallengeInPending`
   - Check `finalCodePreview` shows a valid code

### Step 2: Check Token Exchange Logs

When Cursor exchanges the code:

1. **"Processing authorization code grant - code received from client"**

   - Note the `codePreview` - this is what Cursor sent

2. **"Found pending request with authorization code in Supabase"**

   - Check `codesMatch` - do the codes match?
   - Check `challengesMatch` - does lookup challenge match stored challenge?

3. **"Decoded authorization code data"**

   - Check `codeChallengeInCode` - what challenge is in the code?
   - Does it match what was stored?

4. **"Verifying PKCE code challenge"**
   - Check `storedChallengeInCode` vs `computedChallengeFromVerifier`
   - Check `challengesMatch` - this is the final verdict

### Step 3: Common Issues to Look For

#### Issue 1: Challenge Mismatch in Code

- **Symptom**: `codeChallengeInCode` doesn't match `storedChallengeInPending`
- **Cause**: Code was generated with wrong challenge
- **Fix**: Check authorize endpoint code generation logic

#### Issue 2: Verifier Doesn't Match Challenge

- **Symptom**: `computedChallengeFromVerifier` doesn't match `storedChallengeInCode`
- **Cause**: Cursor is using wrong verifier, or challenge was corrupted
- **Fix**: Check if Cursor is using the correct verifier for the code

#### Issue 3: Code from Request Doesn't Match DB

- **Symptom**: `codesMatch: false` in token endpoint
- **Cause**: Cursor got a different code than what's in DB, or DB wasn't updated
- **Fix**: Check if authorize endpoint properly stored the code

#### Issue 4: Lookup Challenge Doesn't Match

- **Symptom**: `lookupChallengeMatchesCodeChallenge: false`
- **Cause**: The challenge used for DB lookup doesn't match what's in the code
- **Fix**: Check if verifier is being hashed correctly

## Example Log Analysis

### Successful Flow:

```
1. "Stored pending request" → codeChallengeFull: "ABC123..."
2. "Updated pending request" → codeChallengeInStoredCode: "ABC123..." ✅
3. "Found pending request" → codesMatch: true, challengesMatch: true ✅
4. "Decoded code data" → codeChallengeInCode: "ABC123..." ✅
5. "Verifying PKCE" → challengesMatch: true ✅
```

### Failed Flow (Challenge Mismatch):

```
1. "Stored pending request" → codeChallengeFull: "ABC123..."
2. "Updated pending request" → codeChallengeInStoredCode: "ABC123..." ✅
3. "Found pending request" → codesMatch: true, challengesMatch: true ✅
4. "Decoded code data" → codeChallengeInCode: "XYZ789..." ❌ (WRONG!)
5. "Verifying PKCE" → challengesMatch: false ❌
```

## Next Steps

1. **Run the application** and try OAuth flow
2. **Check server logs** for the log messages above
3. **Run debug script** to see database state
4. **Compare** the challenge values at each step
5. **Identify** where the mismatch occurs
6. **Fix** the issue based on findings

## Correlation IDs

All logs include `correlationId` to track a single request through the flow. Use this to:

- Filter logs for a specific request
- Track a request from authorization → token exchange
- Debug concurrent requests (each has unique correlation ID)
