import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth 2.1 Protected Resource Metadata
 * RFC 8414: https://www.rfc-editor.org/rfc/rfc8414.html
 * 
 * This endpoint provides protected resource metadata
 * that MCP clients use to discover resource server configuration
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.toString();
  console.log(`[OAuth Protected Resource Metadata] GET ${url}`);
  
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  const metadata = {
    resource: `${apiUrl}/api/mcp`,
    authorization_servers: [`${apiUrl}/api/oauth/authorize`],
    scopes_supported: [
      'projects:read',
      'projects:write',
      'tasks:read',
      'tasks:write',
      'sessions:read',
      'sessions:write',
    ],
    bearer_methods_supported: ['header'],
  };

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

