# Error Handling Guide

This document describes the centralized error handling system for ProjectFlow, following DRY principles and TypeScript best practices.

## Overview

The error handling system provides:

- **Centralized error capture** to Sentry with consistent context
- **Standardized error responses** across all API routes
- **Type-safe error classes** with HTTP status mapping
- **Automatic error handling** via higher-order function wrappers
- **Graceful degradation** when Sentry is unavailable

## Architecture

```
┌─────────────────┐
│  API Route      │
│  Handler        │
└────────┬────────┘
         │ wrapped with
         ▼
┌─────────────────┐
│ withErrorHandler│
└────────┬────────┘
         │ catches errors
         ▼
┌─────────────────┐      ┌──────────────┐
│ Error Handler   │─────▶│ Sentry Utils │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│ Standardized    │
│ Error Response  │
└─────────────────┘
```

## Error Classes

### Domain Errors

All domain errors extend `ProjectFlowError`:

```typescript
import {
  ProjectFlowError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@projectflow/core";
```

**Error Classes:**

- `ProjectFlowError` - Base error class (HTTP 500)
- `NotFoundError` - Entity not found (HTTP 404)
- `UnauthorizedError` - Permission denied (HTTP 401)
- `ValidationError` - Input validation failed (HTTP 400)

**Features:**

- `getHttpStatus()` - Returns appropriate HTTP status code
- `toJSON()` - Serializes error for API responses
- Pure error classes (no side effects like Sentry capture)

**Example:**

```typescript
throw new ValidationError("projectId is required", "projectId");
throw new NotFoundError("Project not found");
throw new UnauthorizedError("You do not have access to this project");
```

## API Route Error Handling

### Using `withErrorHandler` Wrapper

Wrap your API route handlers to automatically handle errors:

```typescript
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { createSuccessResponse } from "@/lib/errors/responses";
import { UnauthorizedError, ValidationError } from "@projectflow/core";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Your handler logic here
  // Errors are automatically caught, logged, and sent to Sentry

  if (!projectId) {
    throw new ValidationError("projectId is required");
  }

  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  const data = await fetchData();
  return createSuccessResponse({ data });
}, "my-api-route"); // Component name for logging
```

**Benefits:**

- Automatic error capture to Sentry
- Standardized error responses
- Correlation ID tracking
- Request logging
- No manual try-catch needed

### Manual Error Handling

If you need more control, use the error utilities directly:

```typescript
import { handleError } from "@/lib/errors";
import { createErrorResponse } from "@/lib/errors/responses";

export async function GET(request: NextRequest) {
  try {
    // Your logic
  } catch (error) {
    return handleError(
      error,
      {
        component: "my-api",
        method: "GET",
      },
      correlationId
    );
  }
}
```

## Service Layer Error Handling

### Using `withServiceErrorHandler` Wrapper

Wrap service functions for automatic error handling:

```typescript
import { withServiceErrorHandler } from "@projectflow/core";
import { captureError } from "@projectflow/core";

export const createProject = withServiceErrorHandler(
  async (userId: string, data: ProjectData) => {
    // Service logic here
    // Supabase errors are automatically mapped to domain errors
  },
  { component: "projects", method: "createProject" }
);
```

### Manual Error Handling

Service functions typically handle errors internally:

```typescript
import { mapSupabaseError, handleServiceError } from "@projectflow/core";

export async function createProject(client, data) {
  try {
    const { data: project, error } = await client.from("projects").insert(data);

    if (error) {
      throw mapSupabaseError(error); // Maps to domain error
    }

    return project;
  } catch (error) {
    // Re-throw domain errors as-is
    if (error instanceof ProjectFlowError) {
      throw error;
    }
    // Map unknown errors
    throw mapSupabaseError(error);
  }
}
```

## Client-Side Error Handling

### React Error Boundaries

Use the `ErrorBoundary` component to catch React rendering errors:

```typescript
import { ErrorBoundary } from "@/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Next.js Error Boundaries

Next.js provides built-in error boundaries:

- `error.tsx` - Route-level errors
- `global-error.tsx` - Root layout errors

These automatically use centralized error handling.

### Manual Client Error Capture

```typescript
import { captureError } from "@/lib/errors";

try {
  // Your code
} catch (error) {
  captureError(error, {
    component: "my-component",
    userId: user?.id,
  });
}
```

## Sentry Integration

### Centralized Capture

All error capture goes through centralized utilities:

```typescript
import { captureError, setRequestContext, setUserContext } from "@/lib/errors";

// Capture an error
captureError(
  error,
  {
    component: "api-route",
    correlationId: "abc123",
    method: "GET",
    userId: "user-123",
  },
  {
    level: "error",
    tags: { custom: "tag" },
  }
);

// Set request context
setRequestContext({
  component: "api-route",
  correlationId: "abc123",
  method: "GET",
});

// Set user context
setUserContext("user-123", {
  email: "user@example.com",
});
```

### Error Filtering

The system automatically filters expected errors:

- `ValidationError` - Not captured (expected)
- `NotFoundError` - Not captured (expected)
- `UnauthorizedError` - Captured as warning
- Other errors - Captured as error

### Graceful Degradation

If Sentry is unavailable, errors are logged to console in development mode. The application continues to function normally.

## Error Response Format

All API errors follow a standardized format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "projectId is required",
    "details": {
      "field": "projectId"
    }
  },
  "correlationId": "abc-123-def"
}
```

**Success responses:**

```json
{
  "data": { ... },
  "correlationId": "abc-123-def"
}
```

## Best Practices

### 1. Use Domain Error Classes

Always throw domain error classes instead of generic `Error`:

```typescript
// ✅ Good
throw new ValidationError("projectId is required");

// ❌ Bad
throw new Error("projectId is required");
```

### 2. Wrap API Routes

Use `withErrorHandler` for all API routes:

```typescript
// ✅ Good
export const GET = withErrorHandler(async (req) => {
  // Handler logic
}, "component-name");

// ❌ Bad
export async function GET(req) {
  try {
    // Handler logic
  } catch (error) {
    // Manual error handling
  }
}
```

### 3. Provide Context

Always provide context when capturing errors:

```typescript
// ✅ Good
captureError(error, {
  component: "api-route",
  method: "GET",
  userId: user.id,
});

// ❌ Bad
captureError(error);
```

### 4. Don't Capture Expected Errors

Let the system filter expected errors automatically:

```typescript
// ✅ Good - ValidationError is automatically filtered
throw new ValidationError("Invalid input");

// ❌ Bad - Don't manually skip expected errors
if (error instanceof ValidationError) {
  return; // System handles this
}
```

### 5. Use Standardized Responses

Use response builders for consistency:

```typescript
// ✅ Good
return createSuccessResponse({ data }, 200);
return createErrorResponse(error, correlationId);

// ❌ Bad
return NextResponse.json({ data }, { status: 200 });
return NextResponse.json({ error: error.message }, { status: 500 });
```

## Migration Guide

### Migrating API Routes

**Before:**

```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error:", error);
    Sentry.captureException(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**After:**

```typescript
export const GET = withErrorHandler(async (request: NextRequest) => {
  const data = await fetchData();
  return createSuccessResponse({ data });
}, "my-api");
```

### Migrating Service Functions

**Before:**

```typescript
export async function createProject(data) {
  try {
    const result = await db.insert(data);
    return result;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

**After:**

```typescript
export const createProject = withServiceErrorHandler(
  async (data) => {
    const result = await db.insert(data);
    return result;
  },
  { component: "projects", method: "createProject" }
);
```

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check `SENTRY_DSN` environment variable is set
2. Verify error is not filtered (ValidationError, NotFoundError are not captured)
3. Check Sentry initialization in `sentry.client.config.ts` and `sentry.server.config.ts`

### Inconsistent Error Responses

1. Ensure all routes use `withErrorHandler`
2. Use `createErrorResponse` and `createSuccessResponse` helpers
3. Check error classes have `getHttpStatus()` method

### Type Errors

1. Import error classes from `@projectflow/core`
2. Use TypeScript error types: `error instanceof ValidationError`
3. Check error utilities are properly exported

## Examples

See the following files for complete examples:

- `apps/web/src/app/api/events/route.ts` - API route with error handling
- `apps/web/src/app/api/constraints/route.ts` - Multiple handlers
- `packages/core/src/services/projects.ts` - Service layer error handling
- `apps/mcp-server/src/errors.ts` - MCP error mapping

## Summary

The centralized error handling system provides:

- ✅ DRY error handling (single source of truth)
- ✅ Consistent error responses
- ✅ Automatic Sentry integration
- ✅ Type-safe error classes
- ✅ Graceful degradation
- ✅ Best practices for Next.js and TypeScript

For questions or issues, refer to the codebase or create an issue.
