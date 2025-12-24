import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth 2.0 Authorization Server Metadata endpoint (RFC 8414)
 * https://www.rfc-editor.org/rfc/rfc8414.html
 * 
 * This endpoint provides discovery metadata for OAuth clients to learn
 * about the authorization server's capabilities and endpoints.
 */
export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  // OAuth 2.1 with PKCE, backed by Supabase Auth
  return NextResponse.json({
    issuer: apiUrl,
    authorization_endpoint: `${apiUrl}/api/oauth/authorize`,
    token_endpoint: `${apiUrl}/api/oauth/token`,
    registration_endpoint: `${apiUrl}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    scopes_supported: [
      'projects:read',
      'projects:write',
      'tasks:read',
      'tasks:write',
      'sessions:read',
      'sessions:write',
    ],
    token_endpoint_auth_methods_supported: ['none'], // Public clients with PKCE
  });
}
