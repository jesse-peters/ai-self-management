import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * Dynamic Client Registration endpoint (RFC 7591)
 * 
 * Simple implementation that accepts any client registration.
 * We don't store client credentials since we use Supabase Auth.
 * All clients are treated as public clients (no client_secret).
 */
export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json().catch(() => ({}));
  
  // Accept the registration and return a dummy client_id
  // We don't actually store this since we use PKCE and don't require client authentication
  const clientId = `mcp-client-${Date.now()}`;
  
  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      redirect_uris: body.redirect_uris || [],
      token_endpoint_auth_method: 'none', // Public client, uses PKCE
    },
    { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}, 'oauth-register-api');

export async function GET() {
  return NextResponse.json(
    {
      message: 'Dynamic client registration endpoint',
      documentation: 'POST to this endpoint to register an OAuth client',
    },
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

