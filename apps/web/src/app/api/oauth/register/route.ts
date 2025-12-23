import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth 2.0 Dynamic Client Registration Endpoint
 * RFC 7591: https://www.rfc-editor.org/rfc/rfc7591.html
 * 
 * Allows MCP clients to register themselves dynamically
 * For MCP, we use a simplified approach with a default client_id
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const url = request.nextUrl.toString();
  console.log(`[OAuth Register] POST ${url}`);
  
  try {
    const body = await request.json().catch(() => ({}));
    console.log(`[OAuth Register] Request body:`, JSON.stringify(body, null, 2));
    
    // For MCP clients, we use a simplified registration
    // We accept any client registration and return a standard client_id
    const clientId = process.env.OAUTH_DEFAULT_CLIENT_ID || 'mcp-client';
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    console.log(`[OAuth Register] Using client_id: ${clientId}, apiUrl: ${apiUrl}`);

    // Return client registration response
    const response = {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      // No client_secret for public clients (MCP uses PKCE)
      redirect_uris: body.redirect_uris || [],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // Public client, uses PKCE
      application_type: 'web',
      client_name: body.client_name || 'MCP Client',
      scope: body.scope || 'projects:read projects:write tasks:read tasks:write sessions:read sessions:write',
    };
    
    const duration = Date.now() - startTime;
    console.log(`[OAuth Register] Success (${duration}ms):`, JSON.stringify(response, null, 2));
    
    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[OAuth Register] Error (${duration}ms):`, error);
    return NextResponse.json(
      {
        error: 'invalid_client_metadata',
        error_description: error instanceof Error ? error.message : 'Invalid registration request',
      },
      { status: 400 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

