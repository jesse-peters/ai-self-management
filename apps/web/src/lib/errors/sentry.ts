/**
 * Centralized Sentry utilities for error capture
 * Provides unified error capture with context, following DRY principles
 */

import * as Sentry from '@sentry/nextjs';

let isSentryInitialized = false;

/**
 * Lazy initialization of Sentry
 * Called automatically on first error capture attempt
 * This ensures env vars from .env.local (loaded by next.config.ts) are available
 */
function ensureSentryInitialized(): boolean {
    if (isSentryInitialized) {
        return true;
    }

    // Check if DSN is available (env vars should be loaded by now)
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Sentry] SENTRY_DSN not set. Sentry will not capture errors.');
        }
        return false;
    }

    // Check if already initialized by sentry.server.config.ts
    const existingClient = Sentry.getClient();
    if (existingClient) {
        isSentryInitialized = true;
        return true;
    }

    try {
        // Initialize Sentry with configuration (only if not already initialized)
        Sentry.init({
            dsn,

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

        isSentryInitialized = true;

        if (process.env.NODE_ENV === 'development') {
            console.log('[Sentry] Lazy initialization complete with DSN:', dsn.substring(0, 20) + '...');
        }

        return true;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Sentry] Failed to initialize:', error);
        }
        return false;
    }
}

export interface ErrorContext {
    component?: string;
    correlationId?: string;
    userId?: string;
    method?: string;
    [key: string]: unknown;
}

export interface CaptureOptions {
    level?: 'error' | 'warning' | 'info' | 'debug';
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    fingerprint?: string[];
    skipCapture?: boolean;
}

/**
 * Captures an error to Sentry with standardized context
 * Gracefully degrades if Sentry is not available
 * 
 * @param error - Error to capture
 * @param context - Context information about where the error occurred
 * @param options - Additional Sentry capture options
 */
export function captureError(
    error: unknown,
    context?: ErrorContext,
    options?: CaptureOptions
): void {
    // Skip capture if explicitly requested (e.g., for expected errors)
    if (options?.skipCapture) {
        return;
    }

    // Don't capture validation errors - they're expected
    if (error instanceof Error && error.constructor.name === 'ValidationError') {
        return;
    }

    // Don't capture not found errors - they're expected
    if (error instanceof Error && error.constructor.name === 'NotFoundError') {
        return;
    }

    // Lazy initialize Sentry if not already initialized
    // This ensures env vars from .env.local (loaded by next.config.ts) are available
    if (!ensureSentryInitialized()) {
        return; // DSN not available or initialization failed
    }

    try {
        // Verify Sentry client is actually initialized
        const client = Sentry.getClient();
        if (!client) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[Sentry] Client not initialized after ensureSentryInitialized. Error not captured.');
            }
            return;
        }

        // Set user context if provided
        if (context?.userId) {
            Sentry.setUser({ id: context.userId });
        }

        // Set request context
        if (context) {
            Sentry.setContext('error_context', {
                component: context.component,
                correlationId: context.correlationId,
                method: context.method,
                ...Object.fromEntries(
                    Object.entries(context).filter(([key]) =>
                        !['userId', 'component', 'correlationId', 'method'].includes(key)
                    )
                ),
            });
        }

        // Capture the exception
        const eventId = Sentry.captureException(error, {
            level: options?.level || 'error',
            tags: {
                ...(context?.component && { component: context.component }),
                ...(context?.correlationId && { correlationId: context.correlationId }),
                ...(context?.method && { method: context.method }),
                ...options?.tags,
            },
            extra: {
                ...options?.extra,
                ...(context && { context }),
            },
            fingerprint: options?.fingerprint,
        });

        // Log in development to confirm capture
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Sentry] Error captured with event ID: ${eventId}`, {
                error: error instanceof Error ? error.message : String(error),
                component: context?.component,
                correlationId: context?.correlationId,
            });
        }
    } catch (sentryError) {
        // Graceful degradation - if Sentry fails, log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Failed to capture error to Sentry:', sentryError);
            console.error('Original error:', error);
        }
    }
}

/**
 * Sets request context in Sentry
 * Useful for adding metadata about the current request
 * 
 * @param context - Request context information
 */
export function setRequestContext(context: ErrorContext): void {
    try {
        if (context.userId) {
            Sentry.setUser({ id: context.userId });
        }

        Sentry.setContext('request', {
            component: context.component,
            correlationId: context.correlationId,
            method: context.method,
            ...Object.fromEntries(
                Object.entries(context).filter(([key]) =>
                    !['userId'].includes(key)
                )
            ),
        });
    } catch (error) {
        // Graceful degradation
        if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to set Sentry request context:', error);
        }
    }
}

/**
 * Sets user context in Sentry
 * 
 * @param userId - User ID
 * @param additionalData - Additional user data (email, username, etc.)
 */
export function setUserContext(
    userId: string,
    additionalData?: { email?: string; username?: string;[key: string]: unknown }
): void {
    try {
        Sentry.setUser({
            id: userId,
            ...additionalData,
        });
    } catch (error) {
        // Graceful degradation
        if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to set Sentry user context:', error);
        }
    }
}

/**
 * Clears the current Sentry scope
 * Useful for cleaning up context between requests
 */
export function clearSentryScope(): void {
    try {
        Sentry.getCurrentScope().clear();
    } catch (error) {
        // Graceful degradation
        if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to clear Sentry scope:', error);
        }
    }
}

