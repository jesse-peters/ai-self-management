/**
 * Higher-order function wrapper for Next.js API route handlers
 * Automatically handles errors, captures to Sentry, and returns standardized responses
 * 
 * Usage:
 *   export const GET = withErrorHandler(async (req) => {
 *     // Your handler logic here
 *     return NextResponse.json({ data: 'success' });
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorrelationId } from '@/lib/correlationId';
import { createRequestLogger } from '@/lib/logger';
import { handleError, ErrorContext } from '@/lib/errors';
import { createSuccessResponse } from '@/lib/errors/responses';

type RouteHandler = (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

type RouteHandlerWithParams = (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps a Next.js API route handler with automatic error handling
 * 
 * @param handler - The route handler function to wrap
 * @param component - Component name for logging and Sentry context (default: 'api-route')
 * @returns Wrapped handler with error handling
 */
export function withErrorHandler(
    handler: RouteHandler | RouteHandlerWithParams,
    component: string = 'api-route'
): RouteHandler | RouteHandlerWithParams {
    return async (
        request: NextRequest,
        context?: { params?: Promise<Record<string, string>> }
    ): Promise<NextResponse> => {
        const startTime = Date.now();
        const correlationId = getCorrelationId(request);
        const logger = createRequestLogger(correlationId, component);
        const method = request.method;
        const url = request.url;

        // Set up error context
        const errorContext: ErrorContext = {
            component,
            correlationId,
            method,
            url,
        };

        try {
            // Log request start
            logger.debug({
                method,
                url,
            }, 'Request started');

            // Execute the handler
            const response = await handler(request, context as any);

            // Calculate duration
            const duration = Date.now() - startTime;

            // Log successful response
            logger.info({
                method,
                duration,
                status: response.status,
            }, 'Request completed');

            // Add correlation ID to response headers
            response.headers.set('x-correlation-id', correlationId);

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;

            // Log error
            logger.error({
                duration,
                error: error instanceof Error ? error.message : 'Unknown error',
                errorType: error?.constructor?.name,
                stack: error instanceof Error ? error.stack : undefined,
            }, 'Request failed');

            // Handle error with centralized handler (await to ensure Sentry flush completes)
            const errorResponse = await handleError(error, errorContext, correlationId);

            // Add correlation ID to response headers
            errorResponse.headers.set('x-correlation-id', correlationId);

            return errorResponse;
        }
    };
}

/**
 * Wraps a Next.js API route handler that requires params
 * Type-safe version for routes with dynamic segments
 * 
 * @param handler - The route handler function that requires params
 * @param component - Component name for logging and Sentry context
 * @returns Wrapped handler with error handling
 */
export function withErrorHandlerParams(
    handler: RouteHandlerWithParams,
    component: string = 'api-route'
): RouteHandlerWithParams {
    return withErrorHandler(handler, component) as RouteHandlerWithParams;
}

