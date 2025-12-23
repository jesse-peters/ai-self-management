import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    // Check for redirect from query params first, then cookie (for OAuth flow)
    let next = requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirect');
    if (!next) {
        const oauthRedirect = request.cookies.get('oauth_redirect')?.value;
        if (oauthRedirect) {
            next = oauthRedirect;
        }
    }
    if (!next) {
        next = '/dashboard';
    }

    if (code) {
        const supabase = await createServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Successfully exchanged code for session
            const response = NextResponse.redirect(new URL(next, requestUrl.origin));
            // Clear the OAuth redirect cookie after use
            response.cookies.delete('oauth_redirect');
            return response;
        }
    }

    // If there's an error or no code, redirect to login with error message
    return NextResponse.redirect(
        new URL(`/auth/login?error=Unable to authenticate. Please try again.`, requestUrl.origin)
    );
}

