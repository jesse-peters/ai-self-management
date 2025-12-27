/**
 * Sentry Client Configuration
 * This file configures Sentry for the browser/client-side of the Next.js app
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Sanitizes sensitive data from objects (client-side)
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

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Set sample rate for profiling - this is relative to tracesSampleRate
    // Setting to 1.0 means profiling is enabled for 100% of transactions
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay configuration
    // Sample rate for regular sessions (10% in production, 100% in development for testing)
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Always capture replays for sessions with errors (100%)
    replaysOnErrorSampleRate: 1.0,

    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

    // Maximum number of breadcrumbs to capture
    maxBreadcrumbs: 50,

    // Enable capturing uncaught exceptions with enhanced context
    beforeSend(event, hint) {
        // Filter out expected errors or reduce their severity
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
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
            // Mask all text content and user input
            maskAllText: true,
            blockAllMedia: true,
        }),
        // HTTP integration for automatic fetch/XHR request capture
        Sentry.httpClientIntegration(),
        // Console integration for console.error/warn breadcrumbs
        Sentry.consoleIntegration({
            // Only capture console.error and console.warn
            levels: ['error', 'warn'],
        }),
    ],

    // Configure what data to include
    sendDefaultPii: false, // Don't send PII by default

    // Ignore specific errors
    ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'atomicFindClose',
        // Network errors that are expected
        'NetworkError',
        'Network request failed',
        // ResizeObserver errors (common and harmless)
        'ResizeObserver loop limit exceeded',
    ],
});

