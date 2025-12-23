# @projectflow/mcp-server

MCP (Model Context Protocol) server for ProjectFlow. Exposes project/task management capabilities as MCP tools for LLM integration.

## Overview

This server implements the Model Context Protocol to allow LLMs like Claude to interact with ProjectFlow's project management system. It wraps the core service layer and provides a standardized tool interface.

## Installation

This is a workspace package. Install dependencies from the root:

```bash
pnpm install
```

## Running Locally

### With MCP_USER_ID Environment Variable

```bash
MCP_USER_ID=f47ac10b-58cc-4372-a567-0e02b2c3d479 pnpm dev
```

### With User ID in Tool Parameters

When calling tools, include `userId` as a parameter:

```json
{
  "name": "create_project",
  "parameters": {
    "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "My Project"
  }
}
```

## Available Tools

All tools return JSON-serialized results. Errors are returned with a code and message.

### create_project

Creates a new project.

**Parameters:**
- `name` (required): Project name
- `description` (optional): Project description
- `userId` (optional): User ID (falls back to MCP_USER_ID env var)

**Example:**
```json
{
  "name": "create_project",
  "parameters": {
    "name": "Mobile App",
    "description": "iOS and Android app"
  }
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Mobile App",
  "description": "iOS and Android app",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### list_projects

Lists all projects for the user.

**Parameters:**
- `userId` (optional): User ID (falls back to MCP_USER_ID env var)

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Mobile App",
    "description": "iOS and Android app",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
]
```

### create_task

Creates a new task in a project.

**Parameters:**
- `projectId` (required): Project ID
- `title` (required): Task title
- `description` (optional): Task description
- `status` (optional): 'todo' | 'in_progress' | 'done'
- `priority` (optional): 'low' | 'medium' | 'high'
- `userId` (optional): User ID

**Example:**
```json
{
  "name": "create_task",
  "parameters": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Design home screen",
    "priority": "high",
    "status": "in_progress"
  }
}
```

### list_tasks

Lists tasks in a project with optional filters.

**Parameters:**
- `projectId` (required): Project ID
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `userId` (optional): User ID

**Example:**
```json
{
  "name": "list_tasks",
  "parameters": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "in_progress"
  }
}
```

### update_task

Updates an existing task.

**Parameters:**
- `taskId` (required): Task ID
- `title` (optional): New title
- `description` (optional): New description
- `status` (optional): New status
- `priority` (optional): New priority
- `userId` (optional): User ID

**Example:**
```json
{
  "name": "update_task",
  "parameters": {
    "taskId": "650e8400-e29b-41d4-a716-446655440001",
    "status": "done"
  }
}
```

### get_project_context

Gets complete project context including project details, all tasks, and latest session.

**Parameters:**
- `projectId` (required): Project ID
- `userId` (optional): User ID

**Response:**
```json
{
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Mobile App",
    "description": "iOS and Android app",
    ...
  },
  "tasks": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "title": "Design home screen",
      "status": "done",
      ...
    }
  ],
  "latestSession": {
    "id": "750e8400-e29b-41d4-a716-446655440002",
    "snapshot": { "state": "analyzing_requirements", ... },
    "summary": "Completed initial analysis",
    ...
  }
}
```

### save_session_context

Saves an agent session snapshot for a project.

**Parameters:**
- `projectId` (required): Project ID
- `snapshot` (required): Session state snapshot (JSON object)
- `summary` (optional): Session summary
- `userId` (optional): User ID

**Example:**
```json
{
  "name": "save_session_context",
  "parameters": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "snapshot": {
      "state": "designing",
      "tasksCompleted": 3,
      "nextStep": "start_development"
    },
    "summary": "Completed design phase"
  }
}
```

## Error Handling

Errors are returned with a code and message:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation error on field \"name\": Project name is required"
}
```

Error codes:
- `INVALID_PARAMS` - Input validation failed
- `NOT_FOUND` - Entity doesn't exist
- `UNAUTHORIZED` - User doesn't have permission
- `INTERNAL_ERROR` - Server error

## Environment Variables

- `MCP_USER_ID` - Default user ID for all requests (optional)
- `MCP_LOG_LEVEL` - Logging level: 'debug' | 'info' | 'warn' | 'error' (default: 'info')
- `SUPABASE_URL` - Supabase project URL (required)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (required)

## Build

```bash
pnpm build
```

Generates JavaScript files in the `dist/` directory.

## Testing

You can test the server using the MCP Inspector or by running it in stdio mode and sending JSON-RPC messages.

### Using MCP Inspector

```bash
npm install -g @modelcontextprotocol/inspector
MCP_USER_ID=f47ac10b-58cc-4372-a567-0e02b2c3d479 npx mcp-inspector /path/to/node_modules/.bin/mcp-server
```

### Manual Testing

```bash
MCP_USER_ID=f47ac10b-58cc-4372-a567-0e02b2c3d479 pnpm dev
```

Then send tool requests via stdin (JSON-RPC format).

## Architecture

The server is organized into layers:

- **tools.ts** - Tool schema definitions
- **auth.ts** - User ID resolution and validation
- **errors.ts** - Error mapping to MCP responses
- **toolImplementations.ts** - Business logic wrapping core services
- **handlers.ts** - MCP request handlers
- **config.ts** - Configuration management
- **logger.ts** - Logging utilities
- **index.ts** - Server entry point

## Integration with Claude

Once deployed, configure Claude to use this MCP server and it will have access to all ProjectFlow tools.

Configuration example:
```json
{
  "mcp_servers": {
    "projectflow": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "MCP_USER_ID": "your-user-id-here",
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

