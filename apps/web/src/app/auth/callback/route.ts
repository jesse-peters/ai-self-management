import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

export async function GET(request: NextRequest) {
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'auth');

    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    logger.info({
        url: requestUrl.toString(),
        hasCode: !!code,
        codePrefix: code?.substring(0, 8),
    }, 'Auth callback request received');

    // Check for redirect from query params first, then cookie (for OAuth flow)
    let next = requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirect');
    if (!next) {
        const oauthRedirect = request.cookies.get('oauth_redirect')?.value;
        if (oauthRedirect) {
            next = oauthRedirect;
            logger.info({ oauthRedirect }, 'Using OAuth redirect from cookie');
        }
    }
    if (!next) {
        next = '/dashboard';
    }

    logger.info({ next }, 'Redirect target determined');

    if (code) {
        try {
            const supabase = await createServerClient();
            logger.info({ codePrefix: code.substring(0, 8) }, 'Exchanging code for session');

            const { data, error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
                logger.error({
                    error: error.message,
                    errorCode: error.status,
                    hasData: !!data,
                }, 'Failed to exchange code for session');
            } else {
                logger.info({
                    hasSession: !!data.session,
                    hasUser: !!data.user,
                    userId: data.user?.id,
                }, 'Successfully exchanged code for session');
            }

            if (!error) {
                // Successfully exchanged code for session
                const response = NextResponse.redirect(new URL(next, requestUrl.origin));
                // Clear the OAuth redirect cookie after use
                response.cookies.delete('oauth_redirect');
                logger.info({ redirectTo: next }, 'Redirecting after successful authentication');
                return response;
            }
        } catch (err) {
            logger.error({
                error: err instanceof Error ? err.message : 'Unknown error',
                errorType: err?.constructor?.name,
            }, 'Exception during code exchange');
        }
    } else {
        logger.warn('No code parameter in callback URL');
    }

    // If there's an error or no code, redirect to login with error message
    logger.warn('Redirecting to login due to authentication failure');
    return NextResponse.redirect(
        new URL(`/auth/login?error=Unable to authenticate. Please try again.`, requestUrl.origin)
    );
}

