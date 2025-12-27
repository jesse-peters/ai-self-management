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

/**
 * Sanitizes sensitive data from objects
 */
function sanitizeData(data: unknown, maxDepth = 5, currentDepth = 0): unknown {
    if (currentDepth >= maxDepth) {
        return '[Max Depth Reached]';
    }

    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === 'string') {
        // Sanitize common sensitive patterns
        const sensitivePatterns = [
            /password/i,
            /token/i,
            /secret/i,
            /key/i,
            /authorization/i,
            /bearer/i,
            /api[_-]?key/i,
            /access[_-]?token/i,
        ];

        for (const pattern of sensitivePatterns) {
            if (pattern.test(data)) {
                return '[Redacted]';
            }
        }

        // Sanitize JWT tokens (format: xxx.yyy.zzz)
        if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data)) {
            return data.substring(0, 20) + '...[Redacted]';
        }

        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item, maxDepth, currentDepth + 1));
    }

    if (typeof data === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            // Skip sensitive keys
            if (
                lowerKey.includes('password') ||
                lowerKey.includes('token') ||
                lowerKey.includes('secret') ||
                lowerKey.includes('key') ||
                lowerKey.includes('authorization') ||
                lowerKey === 'cookie'
            ) {
                sanitized[key] = '[Redacted]';
            } else {
                sanitized[key] = sanitizeData(value, maxDepth, currentDepth + 1);
            }
        }
        return sanitized;
    }

    return data;
}

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

        // Maximum number of breadcrumbs to capture
        maxBreadcrumbs: 50,

        // Filter out expected errors or reduce their severity, enrich context
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

            // Enrich event with additional context
            if (event.contexts) {
                // Add custom fingerprinting for better error grouping
                if (event.exception) {
                    const error = hint.originalException;
                    if (error instanceof Error) {
                        // Group by error message and component if available
                        const component = event.tags?.component as string | undefined;
                        if (component) {
                            event.fingerprint = [
                                '{{ default }}',
                                error.message,
                                component,
                            ];
                        }
                    }
                }
            }

            // Sanitize request data
            if (event.request) {
                if (event.request.headers) {
                    event.request.headers = sanitizeData(event.request.headers) as Record<string, string>;
                }
                if (event.request.data) {
                    event.request.data = sanitizeData(event.request.data);
                }
                if (event.request.query_string) {
                    event.request.query_string = sanitizeData(event.request.query_string) as string;
                }
            }

            // Sanitize extra data
            if (event.extra) {
                event.extra = sanitizeData(event.extra) as Record<string, unknown>;
            }

            return event;
        },

        // Filter noisy breadcrumbs
        beforeBreadcrumb(breadcrumb, hint) {
            // Filter out noisy console logs in production
            if (
                process.env.NODE_ENV === 'production' &&
                breadcrumb.category === 'console' &&
                breadcrumb.level === 'debug'
            ) {
                return null;
            }

            // Filter out health check requests
            if (
                breadcrumb.category === 'fetch' &&
                breadcrumb.data?.url &&
                (breadcrumb.data.url.includes('/health') ||
                    breadcrumb.data.url.includes('/ping') ||
                    breadcrumb.data.url.includes('/status'))
            ) {
                return null;
            }

            // Sanitize breadcrumb data
            if (breadcrumb.data) {
                breadcrumb.data = sanitizeData(breadcrumb.data) as Record<string, unknown>;
            }

            return breadcrumb;
        },

        // Configure which integrations to use
        integrations: [
            // HTTP integration for automatic request/response capture
            Sentry.httpIntegration(),
            // Console integration for console.error/warn breadcrumbs
            Sentry.consoleIntegration({
                // Only capture console.error and console.warn
                levels: ['error', 'warn'],
            }),
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
            // Network errors that are expected
            'NetworkError',
            'Network request failed',
        ],
    });

    if (process.env.NODE_ENV === 'development') {
        console.log('[Sentry] Initialized at module load with DSN:', process.env.SENTRY_DSN.substring(0, 20) + '...');
    }
} else if (process.env.NODE_ENV === 'development') {
    // Only log in development - in production this might be intentional
    console.log('[Sentry] DSN not available at module load. Will initialize lazily on first error capture.');
}

