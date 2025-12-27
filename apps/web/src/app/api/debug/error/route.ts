import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/withErrorHandler';

/**
 * Debug Error Endpoint
 * Intentionally throws a generic error using promise chaining (.then())
 * to test the centralized error handling system.
 * 
 * GET /api/debug/error
 * 
 * Returns a standardized error response with status 500
 */
export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  // Use .then() to chain a promise that throws an error
  return Promise.resolve('test')
    .then(() => {
      throw new Error('Intentional test error from promise chain');
    });
}, 'debug-error-api');


