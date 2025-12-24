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
    const field = error.field;
    const message = error.message;
    return {
      code: 'INVALID_PARAMS',
      message: `Validation error${field ? ` on field "${field}"` : ''}: ${message}`,
    };
  }

  if (error instanceof NotFoundError) {
    const message = error.message;
    return {
      code: 'NOT_FOUND',
      message: message,
    };
  }

  if (error instanceof UnauthorizedError) {
    const message = error.message;
    return {
      code: 'UNAUTHORIZED',
      message: message,
    };
  }

  if (error instanceof ProjectFlowError) {
    const message = error.message;
    return {
      code: 'INTERNAL_ERROR',
      message: message,
    };
  }

  if (error instanceof Error) {
    const message = error.message;
    return {
      code: 'INTERNAL_ERROR',
      message: message,
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

