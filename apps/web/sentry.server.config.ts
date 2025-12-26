/**
 * Sentry Server Configuration
 * This file configures Sentry for the server-side of the Next.js app
 * 
 * Note: Next.js automatically loads this file. If SENTRY_DSN is available at load time,
 * Sentry will be initialized here. Otherwise, lazy initialization happens in
 * src/lib/errors/sentry.ts when captureError is first called (ensuring env vars
 * from .env.local loaded by next.config.ts are available).
 */

import * as Sentry from '@sentry/nextjs';

// Try to initialize if DSN is available at module load time
// If not available, lazy initialization will happen in captureError
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,

        // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Set sample rate for profiling - this is relative to tracesSampleRate
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

        // Filter out expected errors or reduce their severity
        beforeSend(event, hint) {
            // Filter out expected errors
            if (event.exception) {
                const error = hint.originalException;
                // Don't capture 401/404 errors as errors (they're expected)
                if (error && typeof error === 'object' && 'status' in error) {
                    const status = (error as { status?: number }).status;
                    if (status === 401 || status === 404) {
                        return null; // Don't send to Sentry
                    }
                }
            }
            return event;
        },

        // Configure which integrations to use
        integrations: [
            // Node profiling is handled automatically by @sentry/nextjs
        ],

        // Configure what data to include
        sendDefaultPii: false, // Don't send PII by default

        // Ignore specific errors
        ignoreErrors: [
            // Database connection errors that might be transient
            'ECONNREFUSED',
            'ETIMEDOUT',
            // Validation errors (handled by application)
            'ValidationError',
        ],
    });

    if (process.env.NODE_ENV === 'development') {
        console.log('[Sentry] Initialized at module load with DSN:', process.env.SENTRY_DSN.substring(0, 20) + '...');
    }
} else if (process.env.NODE_ENV === 'development') {
    // Only log in development - in production this might be intentional
    console.log('[Sentry] DSN not available at module load. Will initialize lazily on first error capture.');
}

