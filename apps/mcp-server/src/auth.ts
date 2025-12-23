/**
 * User ID resolution from parameters or environment
 */

import { ValidationError } from '@projectflow/core';

/**
 * Extracts and validates userId from request parameters or environment
 */
export function extractUserId(params: Record<string, unknown>): string {
  // First try to get from request parameters
  if (params.userId && typeof params.userId === 'string') {
    return params.userId;
  }

  // Fall back to environment variable
  const envUserId = process.env.MCP_USER_ID;
  if (envUserId) {
    return envUserId;
  }

  // If neither found, throw error
  throw new ValidationError(
    'userId is required. Provide it as a parameter or set MCP_USER_ID environment variable',
    'userId'
  );
}

/**
 * Validates that userId is a valid UUID format
 */
export function validateUserIdFormat(userId: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new ValidationError('userId must be a valid UUID v4 format', 'userId');
  }
}

/**
 * Gets and validates userId from parameters or environment
 */
export function resolveUserId(params: Record<string, unknown>): string {
  const userId = extractUserId(params);
  validateUserIdFormat(userId);
  return userId;
}

