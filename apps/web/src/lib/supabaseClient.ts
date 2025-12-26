/**
 * Supabase client utilities for the web app
 * Provides both browser and server clients
 */

import { createBrowserClient as createSupabaseBrowserClient, createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { Database } from '@projectflow/db';

/**
 * Creates a Supabase client for browser-side usage
 * Uses the anonymous key and respects RLS policies
 * Can be used in client components and browser code
 */
export function createBrowserClient(): ReturnType<typeof createSupabaseBrowserClient<Database>> {
    // Next.js auto-exposes SUPABASE_URL as NEXT_PUBLIC_SUPABASE_URL via next.config.ts
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        throw new Error('Missing SUPABASE_URL environment variable (exposed as NEXT_PUBLIC_SUPABASE_URL)');
    }

    if (!supabaseAnonKey) {
        throw new Error('Missing SUPABASE_ANON_KEY environment variable (exposed as NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }

    return createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Create a Supabase client for middleware
 */
export function createMiddlewareClient(): ReturnType<typeof createSupabaseBrowserClient<Database>> {
    // Next.js auto-exposes SUPABASE_URL as NEXT_PUBLIC_SUPABASE_URL via next.config.ts
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        throw new Error('Missing SUPABASE_URL environment variable (exposed as NEXT_PUBLIC_SUPABASE_URL)');
    }

    if (!supabaseAnonKey) {
        throw new Error('Missing SUPABASE_ANON_KEY environment variable (exposed as NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }

    return createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client for server-side usage
 * Uses the anonymous key and respects RLS policies
 * Properly handles cookies for Next.js App Router
 * Required for server components and API routes
 */
export async function createServerClient(): Promise<ReturnType<typeof createSupabaseServerClient<Database>>> {
    // Next.js auto-exposes SUPABASE_URL as NEXT_PUBLIC_SUPABASE_URL via next.config.ts
    // For server-side, we can also use SUPABASE_URL directly
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        throw new Error('Missing SUPABASE_URL environment variable');
    }

    if (!supabaseAnonKey) {
        throw new Error('Missing SUPABASE_ANON_KEY environment variable');
    }

    // Dynamic import to avoid build-time evaluation
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    return createSupabaseServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
                try {
                    cookieStore.set({ name, value, ...options });
                } catch (error) {
                    // The `set` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                }
            },
            remove(name: string, options: any) {
                try {
                    cookieStore.set({ name, value: '', ...options });
                } catch (error) {
                    // The `delete` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                }
            },
        },
    });
}

