/**
 * Custom error classes for ProjectFlow domain
 * 
 * Note: Error classes are kept pure (no side effects like Sentry capture).
 * Use centralized error handling utilities to capture errors to Sentry.
 */

/**
 * Base error class for all domain errors
 */
export class ProjectFlowError extends Error {
  constructor(message: string, public code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    // Ensure stack trace is captured
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Gets the HTTP status code for this error
   * Can be overridden by subclasses
   */
  getHttpStatus(): number {
    return 500; // Default to 500 for internal errors
  }

  /**
   * Serializes the error to JSON
   * Useful for API responses and logging
   */
  toJSON(): {
    name: string;
    message: string;
    code: string;
    stack?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      ...(this.stack && { stack: this.stack }),
    };
  }
}

/**
 * Error thrown when a requested entity is not found
 */
export class NotFoundError extends ProjectFlowError {
  constructor(message: string = 'Entity not found') {
    super(message, 'NOT_FOUND');
  }

  getHttpStatus(): number {
    return 404;
  }
}

/**
 * Error thrown when a user doesn't have permission to access a resource
 */
export class UnauthorizedError extends ProjectFlowError {
  constructor(message: string = 'User does not have permission to access this resource') {
    super(message, 'UNAUTHORIZED');
  }

  getHttpStatus(): number {
    return 401;
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends ProjectFlowError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
  }

  getHttpStatus(): number {
    return 400;
  }

  toJSON(): {
    name: string;
    message: string;
    code: string;
    field?: string;
    stack?: string;
  } {
    return {
      ...super.toJSON(),
      ...(this.field && { field: this.field }),
    };
  }
}

/**
 * Maps Supabase errors to domain errors
 */
export function mapSupabaseError(error: any): ProjectFlowError {
  if (!error) {
    return new ProjectFlowError('An unexpected error occurred');
  }

  // Handle Supabase specific error codes
  const message = error.message || error.msg || String(error);

  if (message.includes('no rows') || message.includes('not found')) {
    return new NotFoundError(message);
  }

  if (message.includes('permission') || message.includes('denied')) {
    return new UnauthorizedError(message);
  }

  if (message.includes('invalid') || message.includes('constraint')) {
    return new ValidationError(message);
  }

  return new ProjectFlowError(message);
}

