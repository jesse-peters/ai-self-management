import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';

    if (code) {
        const supabase = await createServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Successfully exchanged code for session
            return NextResponse.redirect(new URL(next, requestUrl.origin));
        }
    }

    // If there's an error or no code, redirect to login with error message
    return NextResponse.redirect(
        new URL(`/auth/login?error=Unable to authenticate. Please try again.`, requestUrl.origin)
    );
}

