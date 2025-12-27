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
import { extractUserFromRequest } from '@/lib/auth/userExtraction';
import { addBreadcrumb, addRequestBreadcrumbs, withSentryTransaction, setRequestContext } from '@/lib/errors/sentry';

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

        // Extract user from request (non-blocking)
        let user: Awaited<ReturnType<typeof extractUserFromRequest>> = null;
        try {
            user = await extractUserFromRequest(request);
        } catch (error) {
            // Silently fail - user extraction is optional
            if (process.env.NODE_ENV === 'development') {
                logger.debug({ error }, 'Failed to extract user from request');
            }
        }

        // Add request breadcrumbs
        addRequestBreadcrumbs(request);

        // Extract query parameters
        const urlObj = new URL(request.url);
        const queryParams: Record<string, string> = {};
        urlObj.searchParams.forEach((value, key) => {
            queryParams[key] = value;
        });

        // Try to extract request body (for POST/PUT/PATCH requests)
        let requestBody: unknown = undefined;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
                // Clone request to read body without consuming it
                const clonedRequest = request.clone();
                const bodyText = await clonedRequest.text();
                if (bodyText) {
                    try {
                        requestBody = JSON.parse(bodyText);
                    } catch {
                        // Not JSON, store as text (truncated)
                        requestBody = bodyText.substring(0, 1000);
                    }
                }
            } catch (error) {
                // Silently fail - body extraction is optional
                if (process.env.NODE_ENV === 'development') {
                    logger.debug({ error }, 'Failed to extract request body');
                }
            }
        }

        // Set up error context with enriched information
        const errorContext: ErrorContext = {
            component,
            correlationId,
            method,
            url,
            user: user || undefined,
            userId: user?.id,
            requestBody: requestBody !== undefined ? requestBody : undefined,
            queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };

        // Set Sentry request context
        setRequestContext({
            component,
            correlationId,
            method,
            url,
            userId: user?.id,
            user: user || undefined,
        });

        // Add breadcrumb for handler execution start
        addBreadcrumb(
            `Handler execution started: ${component}`,
            'custom',
            'info',
            {
                component,
                method,
                pathname: urlObj.pathname,
            }
        );

        try {
            // Log request start
            logger.debug({
                method,
                url,
                hasUser: !!user,
            }, 'Request started');

            // Execute the handler wrapped in a Sentry transaction
            const response = await withSentryTransaction(
                `${method} ${urlObj.pathname}`,
                'http.server',
                async () => {
                    return await handler(request, context as any);
                }
            );

            // Calculate duration
            const duration = Date.now() - startTime;

            // Add breadcrumb for successful response
            addBreadcrumb(
                `Handler execution completed: ${component}`,
                'custom',
                'info',
                {
                    component,
                    method,
                    status: response.status,
                    duration,
                }
            );

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

            // Add breadcrumb for error
            addBreadcrumb(
                `Handler execution failed: ${component}`,
                'error',
                'error',
                {
                    component,
                    method,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    duration,
                }
            );

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

