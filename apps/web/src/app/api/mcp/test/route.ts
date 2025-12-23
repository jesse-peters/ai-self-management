import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@projectflow/db';
import { validateOAuthToken } from '@/lib/oauth';
import { createOAuthToken } from '@projectflow/core';

interface TestResponse {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
}

/**
 * Extracts user ID from Supabase JWT token
 * Used for convenience when testing from web app
 */
async function extractUserIdFromJWT(token: string): Promise<string> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      throw new Error('Invalid token');
    }

    return user.id;
  } catch {
    throw new Error('Authentication failed');
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<TestResponse>> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: 'MCP connection failed',
          error: 'Missing or invalid Authorization header',
        },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Try to validate as OAuth token first
    let userId: string;
    try {
      userId = await validateOAuthToken(token);
    } catch {
      // If OAuth validation fails, try as Supabase JWT (for convenience from web app)
      try {
        userId = await extractUserIdFromJWT(token);
        // Generate an OAuth token for testing
        const clientId = process.env.OAUTH_DEFAULT_CLIENT_ID || 'mcp-client';
        const oauthToken = await createOAuthToken(userId, clientId);
        // Test with the generated OAuth token
        userId = await validateOAuthToken(oauthToken.access_token);
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: 'MCP connection failed',
            error: 'Invalid or expired token',
          },
          { status: 401 }
        );
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'MCP connection successful',
        userId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('MCP test endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'MCP connection failed',
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

