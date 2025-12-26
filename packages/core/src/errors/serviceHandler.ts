/**
 * Service layer error handling utilities
 * Provides wrapper functions for consistent error handling in service functions
 */

import { captureError, ErrorContext } from './sentry';
import {
    mapSupabaseError,
    ProjectFlowError,
    ValidationError,
    NotFoundError
} from '../errors';

/**
 * Determines if an error should be captured to Sentry
 * Expected errors (validation, not found) are not captured
 * 
 * @param error - Error to check
 * @returns true if error should be captured
 */
function shouldCaptureError(error: unknown): boolean {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
        return false;
    }
    return true;
}

/**
 * Determines the appropriate Sentry level for an error
 * 
 * @param error - Error to check
 * @returns Sentry level
 */
function getErrorLevel(error: unknown): 'error' | 'warning' | 'info' {
    if (error instanceof ValidationError) {
        return 'info'; // Validation errors are expected
    }
    // Note: UnauthorizedError check would go here if we import it
    // For now, default to error
    return 'error';
}

/**
 * Wraps a service function with automatic error handling
 * Maps Supabase errors to domain errors and captures to Sentry
 * 
 * @param fn - Service function to wrap
 * @param context - Context information for error reporting
 * @returns Wrapped function with error handling
 * 
 * @example
 * ```typescript
 * export const createProject = withServiceErrorHandler(
 *   async (userId: string, data: ProjectData) => {
 *     // Service logic here
 *   },
 *   { component: 'projects', method: 'createProject' }
 * );
 * ```
 */
export function withServiceErrorHandler<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: ErrorContext
): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        try {
            return await fn(...args);
        } catch (error) {
            // Map Supabase errors to domain errors
            let mappedError: ProjectFlowError;

            // If it's already a domain error, use it
            if (error instanceof ProjectFlowError) {
                mappedError = error;
            } else if (
                error &&
                typeof error === 'object' &&
                ('code' in error || 'message' in error || 'details' in error)
            ) {
                // Check if it's a Supabase error (has code, message, or details)
                mappedError = mapSupabaseError(error);
            } else {
                // Unknown error - wrap it
                mappedError = new ProjectFlowError(
                    error instanceof Error ? error.message : 'An unexpected error occurred'
                );
            }

            // Capture to Sentry if appropriate
            if (shouldCaptureError(mappedError)) {
                captureError(mappedError, {
                    ...context,
                    // Include function arguments in context (be careful with sensitive data)
                    argsCount: args.length,
                }, {
                    level: getErrorLevel(mappedError),
                });
            }

            // Re-throw the mapped error
            throw mappedError;
        }
    }) as T;
}

/**
 * Handles errors in service functions with context
 * Useful for manual error handling when wrapper is not appropriate
 * 
 * @param error - Error to handle
 * @param context - Context information
 * @returns Mapped error ready to throw
 */
export function handleServiceError(
    error: unknown,
    context: ErrorContext
): ProjectFlowError {
    // Map Supabase errors to domain errors
    let mappedError: ProjectFlowError;

    if (error instanceof ProjectFlowError) {
        mappedError = error;
    } else if (
        error &&
        typeof error === 'object' &&
        ('code' in error || 'message' in error || 'details' in error)
    ) {
        mappedError = mapSupabaseError(error);
    } else {
        mappedError = new ProjectFlowError(
            error instanceof Error ? error.message : 'An unexpected error occurred'
        );
    }

    // Capture to Sentry if appropriate
    if (shouldCaptureError(mappedError)) {
        captureError(mappedError, context, {
            level: getErrorLevel(mappedError),
        });
    }

    return mappedError;
}

