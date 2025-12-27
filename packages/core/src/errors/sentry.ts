/**
 * Shared Sentry utilities for server-side error capture
 * Used by both the web app and MCP server
 * Gracefully degrades if Sentry is not available
 */

// Lazy load Sentry to avoid initialization issues if DSN is not set
// Only works in Node.js environment (server-side)
let Sentry: any = null;

function getSentry(): any {
    // Skip Sentry in browser environments (client-side)
    // Check for browser globals that don't exist in Node.js
    if (typeof process === 'undefined' || (globalThis as any).window !== undefined) {
        return null;
    }

    if (Sentry !== null) {
        return Sentry;
    }

    // Only try to load Sentry if DSN is available and we're in Node.js
    // Use extremely dynamic require to prevent Turbopack/webpack static analysis
    if (process.env.SENTRY_DSN && typeof require !== 'undefined') {
        try {
            // Use Function constructor to make require truly dynamic and prevent static analysis
            const requireFunc = new Function('moduleName', 'return require(moduleName)');
            Sentry = requireFunc('@sentry/node');
            return Sentry;
        } catch {
            // Sentry not available, return null
            return null;
        }
    }

    return null;
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

    const sentry = getSentry();
    if (!sentry) {
        // Graceful degradation - log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Sentry not available. Error:', error);
            if (context) {
                console.error('Context:', context);
            }
        }
        return;
    }

    try {
        // Set user context if provided
        if (context?.userId) {
            sentry.setUser({ id: context.userId });
        }

        // Set request context
        if (context) {
            sentry.setContext('error_context', {
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
        sentry.captureException(error, {
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
    const sentry = getSentry();
    if (!sentry) {
        return;
    }

    try {
        if (context.userId) {
            sentry.setUser({ id: context.userId });
        }

        sentry.setContext('request', {
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
    const sentry = getSentry();
    if (!sentry) {
        return;
    }

    try {
        sentry.setUser({
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


