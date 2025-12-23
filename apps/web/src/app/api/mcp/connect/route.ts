import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@projectflow/db';
import { createOAuthToken } from '@projectflow/core';
import { createServerClient } from '@/lib/supabaseClient';

/**
 * Extracts user ID from Supabase JWT token
 * Used for initial authentication from web app to generate OAuth tokens
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Try to get user from session cookie first (if logged in via browser)
    let userId: string | null = null;
    try {
      const supabase = await createServerClient();
      // Use getUser() instead of getSession() to verify user exists in database
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && user) {
        userId = user.id;
        console.log(`[MCP Connect] Using session cookie, userId: ${userId}`);
      }
    } catch (error) {
      console.log(`[MCP Connect] No session cookie found:`, error instanceof Error ? error.message : 'Unknown error');
    }

    // If no session, try to extract JWT from Authorization header or query parameter
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      const tokenParam = request.nextUrl.searchParams.get('token');
      
      let token: string | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      } else if (tokenParam) {
        token = tokenParam;
      }

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid Authorization token. Please log in to the dashboard first, or provide a token.' },
          { status: 401 }
        );
      }

      // Extract user ID from Supabase JWT token (for initial auth from web app)
      try {
        userId = await extractUserIdFromJWT(token);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
    }

    // Generate OAuth token for MCP client
    // Note: We trust the session/user ID from Supabase auth. If the user doesn't exist in auth.users
    // (e.g., after a database reset), the createOAuthToken function will handle the foreign key constraint.
    // Users should log out and log back in after database resets to ensure their user record exists.
    const clientId = process.env.OAUTH_DEFAULT_CLIENT_ID || 'mcp-client';
    let oauthToken;
    try {
      oauthToken = await createOAuthToken(userId, clientId);
    } catch (error) {
      console.error('Failed to create OAuth token:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to generate OAuth token' },
        { status: 500 }
      );
    }

    // Get API URL
    const apiUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin;

    // Generate MCP configuration with OAuth access token
    const config = {
      mcpServers: {
        projectflow: {
          url: `${apiUrl}/api/mcp`,
          headers: {
            Authorization: `Bearer ${oauthToken.access_token}`,
          },
        },
      },
    };

    // Return as JSON for download
    const configJson = JSON.stringify(config, null, 2);
    
    return new NextResponse(configJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cline_mcp_settings.json"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('MCP connect endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

