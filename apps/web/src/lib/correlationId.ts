/**
 * Correlation ID utilities for request tracking
 * Generates unique IDs to track requests across services
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
    return randomUUID();
}

/**
 * Get correlation ID from request headers, or generate a new one
 * @param request - Next.js request object
 * @returns Correlation ID string
 */
export function getCorrelationId(request: NextRequest): string {
    const existingId = request.headers.get(CORRELATION_ID_HEADER);
    if (existingId) {
        return existingId;
    }
    return generateCorrelationId();
}

/**
 * Get correlation ID from request headers (may return null if not present)
 * @param request - Next.js request object
 * @returns Correlation ID string or null
 */
export function getCorrelationIdOrNull(request: NextRequest): string | null {
    return request.headers.get(CORRELATION_ID_HEADER);
}

