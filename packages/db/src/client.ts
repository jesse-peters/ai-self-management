import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Creates a Supabase client for server-side usage.
 * Uses the service role key to bypass RLS policies when available.
 * Falls back to browser client (anon key) in browser/Next.js contexts.
 * Should ONLY be used on the server side when service role is available.
 *
 * @returns Supabase client with database access
 * @throws Error if required environment variables are missing
 */
export function createServerClient() {
  // Check for Next.js browser context first (for client components)
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const nextPublicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (nextPublicUrl && nextPublicAnonKey) {
    // Use browser client for Next.js contexts (client components, etc.)
    return createClient<Database>(nextPublicUrl, nextPublicAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  // Fall back to service role client for server-side/MCP contexts
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
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
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

