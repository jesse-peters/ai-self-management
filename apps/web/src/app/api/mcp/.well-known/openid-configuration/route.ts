import { NextRequest, NextResponse } from 'next/server';

/**
 * OpenID Connect Discovery
 * Some MCP clients check for OpenID Connect configuration
 * 
 * Note: We're implementing OAuth 2.1, not full OIDC, but we provide
 * basic metadata for compatibility
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  const metadata = {
    issuer: apiUrl,
    authorization_endpoint: `${apiUrl}/api/oauth/authorize`,
    token_endpoint: `${apiUrl}/api/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
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

