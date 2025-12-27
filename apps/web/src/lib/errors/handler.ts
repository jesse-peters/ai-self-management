/**
 * Centralized error handler utilities
 * Provides high-level error handling functions for common scenarios
 */

import { captureError, ErrorContext, addBreadcrumb } from './sentry';
import { createErrorResponse, getHttpStatus } from './responses';
import {
    ProjectFlowError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from '@projectflow/core';

/**
 * Determines if an error should be captured to Sentry
 * Expected errors (validation, not found) are not captured
 * 
 * @param error - Error to check
 * @returns true if error should be captured
 */
export function shouldCaptureError(error: unknown): boolean {
    // Don't capture expected errors
    if (error instanceof ValidationError) {
        return false;
    }
    if (error instanceof NotFoundError) {
        return false;
    }

    // Capture unexpected errors
    return true;
}

/**
 * Determines the appropriate Sentry level for an error
 * 
 * @param error - Error to check
 * @returns Sentry level
 */
export function getErrorLevel(error: unknown): 'error' | 'warning' | 'info' {
    if (error instanceof UnauthorizedError) {
        return 'warning'; // Unauthorized is often expected
    }
    if (error instanceof ValidationError) {
        return 'info'; // Validation errors are expected
    }
    return 'error';
}

/**
 * Generates a custom fingerprint for error grouping
 * Groups similar errors together for better issue management
 * 
 * @param error - Error to fingerprint
 * @param context - Error context
 * @returns Fingerprint array
 */
function generateErrorFingerprint(error: unknown, context: ErrorContext): string[] {
    const baseFingerprint = ['{{ default }}'];

    if (error instanceof Error) {
        // Include error message
        baseFingerprint.push(error.message);

        // Include error type/class name
        baseFingerprint.push(error.constructor.name);

        // Include component if available
        if (context.component) {
            baseFingerprint.push(context.component);
        }

        // For ProjectFlowError, include error code
        if (error instanceof ProjectFlowError) {
            baseFingerprint.push(error.code);
        }
    } else {
        // For non-Error objects, use string representation
        baseFingerprint.push(String(error));
    }

    return baseFingerprint;
}

/**
 * Handles an error with full context
 * Captures to Sentry, logs, and creates appropriate response
 * 
 * @param error - Error to handle
 * @param context - Context about where the error occurred
 * @param correlationId - Optional correlation ID
 * @returns Error response
 */
export async function handleError(
    error: unknown,
    context: ErrorContext,
    correlationId?: string
): Promise<ReturnType<typeof createErrorResponse>> {
    // Add breadcrumb for error occurrence
    addBreadcrumb(
        `Error handled: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
        'error',
        {
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            component: context.component,
            correlationId: context.correlationId || correlationId,
            method: context.method,
        }
    );

    // Capture to Sentry if appropriate
    if (shouldCaptureError(error)) {
        // Generate custom fingerprint for better error grouping
        const fingerprint = generateErrorFingerprint(error, context);

        captureError(error, context, {
            level: getErrorLevel(error),
            fingerprint,
        });

        // Flush Sentry events to ensure they're sent before the serverless function exits
        // This is critical in Next.js API routes where the function may exit before Sentry sends
        try {
            const Sentry = await import('@sentry/nextjs');
            const client = Sentry.getClient();

            if (process.env.NODE_ENV === 'development') {
                console.log('[Sentry] Flushing events...', {
                    hasClient: !!client,
                    dsn: client?.getOptions()?.dsn ? 'SET' : 'NOT SET',
                    correlationId: context.correlationId || correlationId,
                });
            }

            // Flush with timeout - don't block too long
            const flushPromise = Sentry.flush(2000);
            const timeoutPromise = new Promise<void>((resolve) => {
                setTimeout(() => {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[Sentry] Flush timeout - continuing anyway');
                    }
                    resolve();
                }, 2500); // Slightly longer than flush timeout
            });

            await Promise.race([flushPromise, timeoutPromise]);

            if (process.env.NODE_ENV === 'development') {
                console.log('[Sentry] Flush completed');
            }
        } catch (flushError) {
            // If flush fails, continue - we don't want to block error responses
            // Log the error but don't throw
            if (process.env.NODE_ENV === 'development') {
                console.error('[Sentry] Flush failed:', flushError);
            }
            // In production, we might want to log to a monitoring service
            // but for now, graceful degradation is sufficient
        }
    }

    // Create and return standardized error response
    return createErrorResponse(error, correlationId);
}

