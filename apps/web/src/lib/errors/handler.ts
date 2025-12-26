/**
 * Centralized error handler utilities
 * Provides high-level error handling functions for common scenarios
 */

import { captureError, ErrorContext } from './sentry';
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
    // Capture to Sentry if appropriate
    if (shouldCaptureError(error)) {
        captureError(error, context, {
            level: getErrorLevel(error),
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
                });
            }

            await Sentry.flush(2000); // Wait up to 2 seconds for events to be sent

            if (process.env.NODE_ENV === 'development') {
                console.log('[Sentry] Flush completed');
            }
        } catch (flushError) {
            // If flush fails, continue - we don't want to block error responses
            if (process.env.NODE_ENV === 'development') {
                console.error('[Sentry] Flush failed:', flushError);
            }
        }
    }

    // Create and return standardized error response
    return createErrorResponse(error, correlationId);
}

