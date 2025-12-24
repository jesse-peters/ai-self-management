import { NextResponse } from 'next/server';

/**
 * OAuth 2.0 Protected Resource Metadata endpoint (RFC 9728)
 * https://www.rfc-editor.org/rfc/rfc9728.html
 * 
 * This endpoint provides metadata about the protected resource (MCP server)
 * and its relationship to authorization servers.
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
    resource: `${apiUrl}/api/mcp`,
    authorization_servers: [apiUrl],
    scopes_supported: [
      'projects:read',
      'projects:write',
      'tasks:read',
      'tasks:write',
      'sessions:read',
      'sessions:write',
    ],
    bearer_methods_supported: ['header'],
    resource_documentation: `${apiUrl}/docs`,
  });
}
