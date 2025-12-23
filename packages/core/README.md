# @projectflow/core

Domain logic layer for ProjectFlow. Provides a clean, type-safe API for all project/task/session operations with built-in validation and error handling.

## Purpose

This package encapsulates all business logic and ensures a single source of truth for how the system works. It abstracts away database details and provides a consistent interface for the MCP server and web app.

## Installation

This is a workspace package. Install dependencies from the root:

```bash
pnpm install
```

## Architecture

The core package is organized into logical layers:

- **types.ts** - Domain types and interfaces
- **errors.ts** - Custom error classes and error mapping
- **validation.ts** - Input validation utilities
- **services/** - Business logic organized by domain (projects, tasks, sessions)

## Usage

### Creating a Project

```typescript
import { createProject, ValidationError } from '@projectflow/core';

try {
  const project = await createProject(userId, {
    name: 'My Project',
    description: 'An optional description',
  });
  console.log('Created project:', project.id);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  } else {
    console.error('Failed to create project:', error);
  }
}
```

### Listing Projects

```typescript
import { listProjects } from '@projectflow/core';

const projects = await listProjects(userId);
console.log('User has', projects.length, 'projects');
```

### Creating a Task

```typescript
import { createTask } from '@projectflow/core';

const task = await createTask(userId, projectId, {
  title: 'Build dashboard',
  description: 'Create a React dashboard',
  priority: 'high',
  status: 'todo',
});
```

### Listing Tasks

```typescript
import { listTasks } from '@projectflow/core';

// List all tasks
const allTasks = await listTasks(userId, projectId);

// List with filters
const inProgressTasks = await listTasks(userId, projectId, {
  status: 'in_progress',
});

const highPriorityTasks = await listTasks(userId, projectId, {
  priority: 'high',
});
```

### Updating a Task

```typescript
import { updateTask } from '@projectflow/core';

const updatedTask = await updateTask(userId, taskId, {
  status: 'in_progress',
  priority: 'medium',
});
```

### Saving Session Context

```typescript
import { saveSessionContext } from '@projectflow/core';

const session = await saveSessionContext(userId, projectId, {
  state: 'analyzing',
  tasksProcessed: 5,
  nextAction: 'create_subtasks',
}, 'Processing project analysis');
```

### Getting Project Context

```typescript
import { getProjectContext } from '@projectflow/core';

const context = await getProjectContext(userId, projectId);
console.log('Project:', context.project.name);
console.log('Tasks:', context.tasks.length);
console.log('Latest session:', context.latestSession?.summary);
```

## Error Handling

The package defines several custom error types:

- **ValidationError** - Input validation failed
- **NotFoundError** - Entity doesn't exist
- **UnauthorizedError** - User doesn't have permission
- **ProjectFlowError** - Generic domain error

```typescript
import {
  createProject,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from '@projectflow/core';

try {
  const project = await createProject(userId, { name: '' });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation error on field "${error.field}":`, error.message);
  } else if (error instanceof UnauthorizedError) {
    console.error('Access denied:', error.message);
  } else if (error instanceof NotFoundError) {
    console.error('Not found:', error.message);
  } else {
    console.error('Error:', error.message);
  }
}
```

## Security

**Important security features:**

- All functions validate the `userId` to ensure it's a valid UUID
- All operations verify that the user owns the resource they're accessing
- No direct database access from consumers - all queries go through this layer
- RLS policies at the database level provide additional protection

## Environment Variables

This package requires the same environment variables as `@projectflow/db`:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)

## Build

```bash
pnpm build
```

Generates TypeScript declarations and JavaScript files in the `dist/` directory.

## Type Checking

```bash
pnpm type-check
```

Runs TypeScript compiler without emitting files.

## Service Functions Reference

### Projects
- `createProject(userId, data)` - Create a new project
- `listProjects(userId)` - List all projects for a user
- `getProject(userId, projectId)` - Get a single project

### Tasks
- `createTask(userId, projectId, data)` - Create a task
- `listTasks(userId, projectId, filters?)` - List tasks with optional filters
- `updateTask(userId, taskId, patch)` - Update a task

### Sessions
- `saveSessionContext(userId, projectId, snapshot, summary?)` - Save agent session
- `getLatestSession(userId, projectId)` - Get the latest session
- `getProjectContext(userId, projectId)` - Get full project context

All functions are fully typed and return Promise<T>.

