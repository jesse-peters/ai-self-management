/**
 * Standardized error response utilities
 * Provides consistent error response formats across all API routes
 */

import { NextResponse } from 'next/server';
import {
    ProjectFlowError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from '@projectflow/core';

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
    correlationId?: string;
}

/**
 * Maps domain error codes to HTTP status codes
 */
export function getHttpStatus(error: unknown): number {
    if (error instanceof ProjectFlowError) {
        return error.getHttpStatus();
    }
    // Unknown errors default to 500
    return 500;
}

/**
 * Creates a standardized error response
 * 
 * @param error - Error to create response for
 * @param correlationId - Optional correlation ID for request tracking
 * @param includeDetails - Whether to include error details (default: false in production)
 * @returns NextResponse with error information
 */
export function createErrorResponse(
    error: unknown,
    correlationId?: string,
    includeDetails: boolean = process.env.NODE_ENV !== 'production'
): NextResponse<ErrorResponse> {
    const status = getHttpStatus(error);

    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (error instanceof ProjectFlowError) {
        code = error.code;
        message = error.message;
        if (includeDetails && error instanceof ValidationError && error.field) {
            details = { field: error.field };
        }
    } else if (error instanceof Error) {
        message = error.message;
        if (includeDetails) {
            details = {
                name: error.name,
                stack: error.stack,
            };
        }
    } else if (typeof error === 'string') {
        message = error;
    }

    const errorObj: ErrorResponse['error'] = {
        code,
        message,
    };

    if (details !== undefined) {
        errorObj.details = details;
    }

    const response: ErrorResponse = {
        error: errorObj,
    };

    if (correlationId !== undefined) {
        response.correlationId = correlationId;
    }

    return NextResponse.json(response, { status });
}

/**
 * Creates a standardized success response
 * Useful for consistency even in success cases
 * 
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @param correlationId - Optional correlation ID
 * @returns NextResponse with data
 */
export function createSuccessResponse<T>(
    data: T,
    status: number = 200,
    correlationId?: string
): NextResponse<{ data: T; correlationId?: string }> {
    const response: { data: T; correlationId?: string } = { data };

    if (correlationId !== undefined) {
        response.correlationId = correlationId;
    }

    return NextResponse.json(response, { status });
}

