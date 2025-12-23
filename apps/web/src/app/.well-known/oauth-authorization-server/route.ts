import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth 2.1 Authorization Server Metadata
 * RFC 8414: https://www.rfc-editor.org/rfc/rfc8414.html
 * 
 * This endpoint provides OAuth authorization server metadata
 * that MCP clients use to auto-discover OAuth configuration
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.toString();
  console.log(`[OAuth Metadata] GET ${url}`);
  
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  const metadata = {
    issuer: apiUrl,
    authorization_endpoint: `${apiUrl}/api/oauth/authorize`,
    token_endpoint: `${apiUrl}/api/oauth/token`,
    revocation_endpoint: `${apiUrl}/api/oauth/revoke`,
    registration_endpoint: `${apiUrl}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    code_challenge_methods_supported: ['plain', 'S256'],
    scopes_supported: [
      'projects:read',
      'projects:write',
      'tasks:read',
      'tasks:write',
      'sessions:read',
      'sessions:write',
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

