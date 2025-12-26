import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Creates a Supabase client for server-side usage with service role key
 * WARNING: This bypasses RLS policies. Only use for:
 * - OAuth token management
 * - Admin operations
 * 
 * For user data access, use createOAuthScopedClient or session-based client.
 * 
 * @returns Supabase client that bypasses RLS
 * @throws Error if required environment variables are missing
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceRoleKey) {
    // Use service role client for server-side/MCP contexts (bypasses RLS)
    return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  // Fall back to anon key only if service role is not available
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    // Use browser client for Next.js contexts (client components, etc.)
    // Note: This respects RLS policies
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }

  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable');
}

/**
 * Backward compatibility wrapper for createServiceRoleClient
 * @deprecated Use createServiceRoleClient instead
 */
export function createServerClient() {
  return createServiceRoleClient();
}

/**
 * Creates a Supabase client for browser-side usage.
 * Uses the anonymous key and respects RLS policies.
 * Can be used in browsers and client-side code.
 *
 * @returns Supabase client with RLS-constrained access
 * @throws Error if required environment variables are missing
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY environment variable');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Creates a Supabase client authenticated with an OAuth access token.
 * The token must be a JWT signed with Supabase's secret and include:
 * - sub: user ID
 * - role: 'authenticated'
 * 
 * This client respects RLS policies using the token's user context.
 *
 * @param accessToken JWT access token from OAuth flow
 * @returns Supabase client with user authentication context
 * @throws Error if required environment variables are missing
 */
export function createOAuthScopedClient(accessToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY environment variable');
  }

  try {
    // Create client with token in Authorization header
    // Supabase PostgREST will extract the JWT from the Authorization header
    // and use it for RLS policy evaluation via auth.uid()
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        // Don't try to parse the token as a session - we're passing it as a header
        storage: undefined,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('key') || errorMessage.includes('type')) {
      throw new Error(
        `Failed to create Supabase OAuth client: ${errorMessage}. ` +
        `URL: ${supabaseUrl ? 'set' : 'missing'}, ` +
        `Anon Key: ${supabaseAnonKey ? `set (length: ${supabaseAnonKey.length})` : 'missing'}, ` +
        `Access Token: ${accessToken ? `set (length: ${accessToken.length})` : 'missing'}. ` +
        `Please verify your Supabase configuration.`
      );
    }
    throw error;
  }
}

