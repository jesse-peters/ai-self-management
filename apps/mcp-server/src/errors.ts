/**
 * Error mapping from domain errors to MCP error responses
 */

import * as Sentry from '@sentry/node';
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
 * Also captures errors to Sentry for monitoring
 */
export function mapErrorToMCP(error: unknown, context?: { method?: string; userId?: string }): MCPErrorResponse {
  // Set context in Sentry if available (will merge with existing context from routeToolCall)
  if (context) {
    Sentry.setContext('mcp_request', {
      method: context.method,
      userId: context.userId,
    });
    if (context.userId) {
      Sentry.setUser({ id: context.userId });
    }
  }
  // If no context provided, existing Sentry context from routeToolCall will be used

  if (error instanceof ValidationError) {
    const field = error.field;
    const message = error.message;
    // Don't capture validation errors - they're expected
    return {
      code: 'INVALID_PARAMS',
      message: `Validation error${field ? ` on field "${field}"` : ''}: ${message}`,
    };
  }

  if (error instanceof NotFoundError) {
    const message = error.message;
    // Don't capture not found errors - they're expected
    return {
      code: 'NOT_FOUND',
      message: message,
    };
  }

  if (error instanceof UnauthorizedError) {
    const message = error.message;
    // Capture unauthorized errors but with lower severity
    if (error instanceof Error) {
      Sentry.captureException(error, {
        level: 'warning',
        tags: {
          error_type: 'unauthorized',
          mcp_error_code: 'UNAUTHORIZED',
        },
      });
    }
    return {
      code: 'UNAUTHORIZED',
      message: message,
    };
  }

  if (error instanceof ProjectFlowError) {
    const message = error.message;
    // Capture domain errors
    if (error instanceof Error) {
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          error_type: 'domain_error',
          error_code: error.code,
          mcp_error_code: 'INTERNAL_ERROR',
        },
        extra: {
          errorCode: error.code,
        },
      });
    }
    return {
      code: 'INTERNAL_ERROR',
      message: message,
    };
  }

  if (error instanceof Error) {
    const message = error.message;
    // Capture unexpected errors
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        error_type: 'unexpected_error',
        mcp_error_code: 'INTERNAL_ERROR',
      },
    });
    return {
      code: 'INTERNAL_ERROR',
      message: message,
    };
  }

  // Capture unknown errors
  const unknownError = new Error('An unexpected error occurred');
  Sentry.captureException(unknownError, {
    level: 'error',
    tags: {
      error_type: 'unknown_error',
      mcp_error_code: 'INTERNAL_ERROR',
    },
    extra: {
      originalError: String(error),
    },
  });

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

