import { NextResponse } from 'next/server';

/**
 * OAuth 2.0 Authorization Server Metadata endpoint (RFC 8414)
 * https://www.rfc-editor.org/rfc/rfc8414.html
 * 
 * This endpoint provides discovery metadata for OAuth clients to learn
 * about the authorization server's capabilities and endpoints.
 */
export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_APP_URL not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    issuer: apiUrl,
    authorization_endpoint: `${apiUrl}/api/oauth/authorize`,
    token_endpoint: `${apiUrl}/api/oauth/token`,
    revocation_endpoint: `${apiUrl}/api/oauth/revoke`,
    registration_endpoint: `${apiUrl}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [
      'projects:read',
      'projects:write',
      'tasks:read',
      'tasks:write',
      'sessions:read',
      'sessions:write',
    ],
    token_endpoint_auth_methods_supported: ['none'], // PKCE instead of client secret
  });
}
