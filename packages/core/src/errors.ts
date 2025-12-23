/**
 * Custom error classes for ProjectFlow domain
 */

/**
 * Base error class for all domain errors
 */
export class ProjectFlowError extends Error {
  constructor(message: string, public code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a requested entity is not found
 */
export class NotFoundError extends ProjectFlowError {
  constructor(message: string = 'Entity not found') {
    super(message, 'NOT_FOUND');
  }
}

/**
 * Error thrown when a user doesn't have permission to access a resource
 */
export class UnauthorizedError extends ProjectFlowError {
  constructor(message: string = 'User does not have permission to access this resource') {
    super(message, 'UNAUTHORIZED');
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends ProjectFlowError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
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

