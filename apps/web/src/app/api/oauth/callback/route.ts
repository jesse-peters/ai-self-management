import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

/**
 * OAuth 2.1 Callback Handler
 * Receives authorization code and bounces to Cursor deep link
 * Converts from HTTPS/HTTP callback to cursor:// deep link scheme
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'oauth');

    try {
        const code = request.nextUrl.searchParams.get('code');
        const state = request.nextUrl.searchParams.get('state');
        const error = request.nextUrl.searchParams.get('error');
        const errorDescription = request.nextUrl.searchParams.get('error_description');

        logger.info({
            hasCode: !!code,
            hasState: !!state,
            hasError: !!error,
            error,
            errorDescription,
            codePrefix: code?.substring(0, 8),
            fullUrl: request.url,
        }, 'OAuth callback received');

        // Check for errors from Supabase OAuth 2.1
        if (error) {
            logger.error({
                error,
                errorDescription,
                state,
                fullUrl: request.url,
            }, 'Supabase OAuth 2.1 returned an error');

            // Build user-friendly error message based on error type
            let userFriendlyMessage = 'OAuth authorization failed.';

            if (error === 'invalid_client') {
                userFriendlyMessage = 'OAuth client not registered in Supabase. Please register the client in Supabase Dashboard → Auth → OAuth Apps.';
            } else if (error === 'unauthorized_client') {
                userFriendlyMessage = 'OAuth client is not authorized. Please check client registration in Supabase Dashboard → Auth → OAuth Apps.';
            } else if (error === 'access_denied') {
                userFriendlyMessage = 'Authorization was denied. Please try again.';
            } else if (error === 'invalid_request') {
                userFriendlyMessage = `Invalid OAuth request: ${errorDescription || error}`;
            } else if (error === 'server_error') {
                userFriendlyMessage = 'Supabase OAuth 2.1 server error. Please check if OAuth Server is enabled in Supabase Dashboard → Auth → OAuth Server.';
            } else if (errorDescription) {
                userFriendlyMessage = `OAuth error: ${errorDescription}`;
            }

            // Build Cursor deep link with error
            const deepLink = new URL('cursor://anysphere.cursor-mcp/oauth/callback');
            deepLink.searchParams.set('error', error);
            if (errorDescription) {
                deepLink.searchParams.set('error_description', errorDescription);
            }
            if (state) {
                deepLink.searchParams.set('state', state);
            }

            logger.info({
                deepLink: deepLink.toString().substring(0, 100) + '...',
                userFriendlyMessage,
            }, 'Redirecting to Cursor deep link with error');

            return NextResponse.redirect(deepLink.toString(), 302);
        }

        // No error - check if we have a code
        if (!code) {
            logger.warn({
                hasState: !!state,
                fullUrl: request.url,
            }, 'OAuth callback received without code or error - this may indicate a configuration issue');

            // Build Cursor deep link with error
            const deepLink = new URL('cursor://anysphere.cursor-mcp/oauth/callback');
            deepLink.searchParams.set('error', 'invalid_request');
            deepLink.searchParams.set('error_description', 'No authorization code received from Supabase OAuth 2.1. Please check OAuth Server configuration.');
            if (state) {
                deepLink.searchParams.set('state', state);
            }

            return NextResponse.redirect(deepLink.toString(), 302);
        }

        // Success - build Cursor deep link with code
        const deepLink = new URL('cursor://anysphere.cursor-mcp/oauth/callback');
        deepLink.searchParams.set('code', code);
        if (state) {
            deepLink.searchParams.set('state', state);
        }

        logger.info({
            deepLink: deepLink.toString().substring(0, 100) + '...',
            codePrefix: code.substring(0, 8),
        }, 'Redirecting to Cursor deep link with authorization code');

        return NextResponse.redirect(deepLink.toString(), 302);
    } catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
        }, 'OAuth callback error');

        return NextResponse.json(
            {
                error: 'server_error',
                error_description: 'Callback processing failed',
            },
            { status: 500 }
        );
    }
}

