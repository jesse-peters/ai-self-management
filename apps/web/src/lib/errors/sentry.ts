/**
 * Centralized Sentry utilities for error capture
 * Provides unified error capture with context, following DRY principles
 */

import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import type { ExtractedUser } from '@/lib/auth/userExtraction';

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
    url?: string;
    requestBody?: unknown;
    queryParams?: Record<string, string>;
    user?: ExtractedUser;
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

        // Set user context if provided (prefer full user object, fallback to userId)
        if (context?.user) {
            Sentry.setUser({
                id: context.user.id,
                email: context.user.email,
                username: context.user.username,
            });
        } else if (context?.userId) {
            Sentry.setUser({ id: context.userId });
        }

        // Add breadcrumb for the error
        addBreadcrumb(
            error instanceof Error ? error.message : String(error),
            'error',
            'error',
            {
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                component: context?.component,
                correlationId: context?.correlationId,
            }
        );

        // Set request context with sanitized data
        if (context) {
            const sanitizedContext: Record<string, unknown> = {
                component: context.component,
                correlationId: context.correlationId,
                method: context.method,
                url: context.url,
            };

            // Add sanitized request body if present
            if (context.requestBody !== undefined) {
                sanitizedContext.requestBody = sanitizeData(context.requestBody);
            }

            // Add sanitized query params if present
            if (context.queryParams) {
                sanitizedContext.queryParams = sanitizeData(context.queryParams);
            }

            // Add other context fields (excluding sensitive ones)
            const excludedKeys = ['userId', 'user', 'component', 'correlationId', 'method', 'url', 'requestBody', 'queryParams'];
            for (const [key, value] of Object.entries(context)) {
                if (!excludedKeys.includes(key)) {
                    sanitizedContext[key] = sanitizeData(value);
                }
            }

            Sentry.setContext('error_context', sanitizedContext);
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

/**
 * Adds a breadcrumb to Sentry
 * Useful for tracking the sequence of events leading to an error
 * 
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category (e.g., 'http', 'console', 'navigation')
 * @param level - Breadcrumb level (default: 'info')
 * @param data - Additional breadcrumb data (will be sanitized)
 */
export function addBreadcrumb(
    message: string,
    category: string = 'custom',
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, unknown>
): void {
    try {
        if (!ensureSentryInitialized()) {
            return;
        }

        Sentry.addBreadcrumb({
            message,
            category,
            level,
            data: data ? sanitizeData(data) as Record<string, unknown> : undefined,
            timestamp: Date.now() / 1000,
        });
    } catch (error) {
        // Graceful degradation
        if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to add Sentry breadcrumb:', error);
        }
    }
}

/**
 * Adds request metadata as breadcrumbs
 * Extracts and sanitizes request information for debugging
 * 
 * @param request - Next.js request object
 */
export function addRequestBreadcrumbs(request: NextRequest): void {
    try {
        const url = new URL(request.url);

        // Add request start breadcrumb
        addBreadcrumb(
            `${request.method} ${url.pathname}`,
            'http',
            'info',
            {
                method: request.method,
                url: url.toString(),
                pathname: url.pathname,
                search: url.search,
            }
        );

        // Add query params if present
        if (url.searchParams.toString()) {
            const queryParams: Record<string, string> = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            addBreadcrumb(
                'Request query parameters',
                'http',
                'info',
                { queryParams: sanitizeData(queryParams) as Record<string, string> }
            );
        }
    } catch (error) {
        // Graceful degradation
        if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to add request breadcrumbs:', error);
        }
    }
}

/**
 * Wraps an async function in a Sentry transaction for performance monitoring
 * Useful for tracking API route performance
 * 
 * @param name - Transaction name
 * @param op - Operation type (e.g., 'http.server', 'function')
 * @param fn - Function to wrap
 * @returns Result of the function
 */
export async function withSentryTransaction<T>(
    name: string,
    op: string,
    fn: () => Promise<T>
): Promise<T> {
    try {
        if (!ensureSentryInitialized()) {
            return await fn();
        }

        return await Sentry.startSpan(
            {
                name,
                op,
            },
            async () => {
                return await fn();
            }
        );
    } catch (error) {
        // If transaction fails, still execute the function
        if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to start Sentry transaction:', error);
        }
        return await fn();
    }
}

