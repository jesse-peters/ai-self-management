/**
 * Custom error classes for ProjectFlow domain
 */

// Lazy load Sentry to avoid initialization issues if DSN is not set
// Only works in Node.js environment (server-side)
let Sentry: any = null;

function getSentry(): any {
  // Skip Sentry in browser environments (client-side)
  // Check for browser globals that don't exist in Node.js
  if (typeof process === 'undefined' || (globalThis as any).window !== undefined) {
    return null;
  }

  if (Sentry !== null) {
    return Sentry;
  }

  // Only try to load Sentry if DSN is available and we're in Node.js
  // Use extremely dynamic require to prevent Turbopack/webpack static analysis
  if (process.env.SENTRY_DSN && typeof require !== 'undefined') {
    try {
      // Use Function constructor to make require truly dynamic and prevent static analysis
      const requireFunc = new Function('moduleName', 'return require(moduleName)');
      Sentry = requireFunc('@sentry/node');
      return Sentry;
    } catch {
      // Sentry not available, return null
      return null;
    }
  }

  return null;
}

/**
 * Base error class for all domain errors
 */
export class ProjectFlowError extends Error {
  constructor(message: string, public code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);

    // Capture to Sentry if available (graceful degradation)
    const sentry = getSentry();
    if (sentry) {
      sentry.captureException(this, {
        level: 'error',
        tags: {
          error_type: 'domain_error',
          error_code: this.code,
          error_class: this.constructor.name,
        },
        extra: {
          errorCode: this.code,
          errorMessage: message,
        },
      });
    }
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

    // Validation errors are expected, so we don't capture them to Sentry
    // They're handled by the application logic
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

