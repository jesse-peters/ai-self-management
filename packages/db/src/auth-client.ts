/**
 * Auth-scoped Supabase clients for RLS-enforced access
 * Provides two patterns: session-based (web) and OAuth-based (MCP)
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Creates a Supabase client that respects RLS policies via anon key and session
 * Used by Next.js server components and API routes with session auth
 * 
 * Note: Session handling is managed by Supabase automatically via cookies.
 * The client uses the anon key and RLS policies enforce data access.
 *
 * @returns SupabaseClient with session-based auth
 */
export function createSessionClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Creates a Supabase client scoped to an OAuth token
 * Used by MCP server and API endpoints with Bearer token auth
 *
 * The client calls auth.set_user_from_oauth() to establish auth context
 * for RLS policies. Subsequent queries are automatically filtered to the
 * authenticated user's data.
 *
 * @param oauthAccessToken The OAuth access token from MCP client
 * @returns SupabaseClient with OAuth token auth
 * @throws Error if token is invalid or expired
 */
export async function createOAuthScopedClient(oauthAccessToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  // Create client with anon key (respects RLS)
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Set user context from OAuth token via database function
  // This function:
  // 1. Validates the token (checks oauth_tokens table)
  // 2. Ensures token is not revoked and not expired
  // 3. Sets request.jwt.claim.sub to the user ID
  // 4. Subsequent queries are filtered by RLS policies using auth.current_user_id()
  const { error } = await (client as any).rpc('set_user_from_oauth', {
    token: oauthAccessToken,
  });

  if (error) {
    throw new Error(`Invalid OAuth token: ${error.message}`);
  }

  return client;
}

/**
 * Type guard to detect if a client is OAuth-scoped
 * (This is mainly for documentation purposes)
 */
export function isOAuthScopedClient(client: any): boolean {
  return client !== undefined;
}

