/**
 * Error mapping from domain errors to MCP error responses
 */

import {
  ProjectFlowError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from '@projectflow/core';

export interface MCPErrorResponse {
  code: string;
  message: string;
}

/**
 * Maps domain errors to MCP error responses
 */
export function mapErrorToMCP(error: unknown): MCPErrorResponse {
  if (error instanceof ValidationError) {
    return {
      code: 'INVALID_PARAMS',
      message: `Validation error${error.field ? ` on field "${error.field}"` : ''}: ${error.message}`,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      code: 'NOT_FOUND',
      message: error.message,
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      code: 'UNAUTHORIZED',
      message: error.message,
    };
  }

  if (error instanceof ProjectFlowError) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };
}

/**
 * Checks if an error is a known domain error
 */
export function isDomainError(error: unknown): error is ProjectFlowError {
  return error instanceof ProjectFlowError;
}

