# ProjectFlow MCP OAuth Setup

## Overview

Your ProjectFlow MCP server now has a working OAuth 2.1 flow with PKCE that uses Supabase Auth directly - **no custom OAuth database tables required**.

## How It Works

1. **Client Registration** (`/api/oauth/register`) - Accepts any client, returns a client_id (no storage)
2. **Authorization** (`/api/oauth/authorize`) - Authenticates user via Supabase, encodes tokens in authorization code
3. **Token Exchange** (`/api/oauth/token`) - Validates PKCE challenge, returns Supabase JWT tokens
4. **Token Refresh** (`/api/oauth/token`) - Uses Supabase's built-in refresh mechanism

## Key Features

- ✅ **No database tables needed** - All state is encoded in the authorization code itself
- ✅ **PKCE security** - No client secrets, uses code_challenge/code_verifier
- ✅ **Supabase Auth integration** - Returns real Supabase JWT tokens
- ✅ **Automatic token refresh** - Supports refresh_token grant type

## For Cursor IDE

Configure your MCP server in Cursor settings:

```json
{
  "mcpServers": {
    "projectflow": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

Cursor will automatically:
1. Call `/api/oauth/register` to register as a client
2. Call `/api/oauth/authorize` which redirects to your login page
3. After you log in, exchange the code for tokens
4. Use the tokens to call MCP tools

## Testing Locally

1. Make sure your server is running: `pnpm dev`
2. Configure Cursor with the URL above
3. Cursor will prompt you to authenticate in your browser
4. Log in to your account
5. Cursor will automatically receive the tokens and start showing tools

## Endpoints

- **Discovery**: `GET /.well-known/oauth-authorization-server`
- **Register Client**: `POST /api/oauth/register`
- **Authorize**: `GET /api/oauth/authorize?client_id=...&redirect_uri=...&code_challenge=...`
- **Token**: `POST /api/oauth/token` (grant_type: authorization_code or refresh_token)

## Security Notes

- Authorization codes expire in 10 minutes
- Tokens are stored in the code itself (base64url encoded)
- PKCE is required (code_challenge_method: S256 or plain)
- All clients are treated as public clients (no client_secret)

## Next Steps

1. **Try connecting Cursor now** - It should automatically trigger the OAuth flow
2. If you see the login page, authenticate
3. You should be redirected back to Cursor with working tools
4. Check the terminal logs to see the OAuth flow in action



