# @projectflow/mcp-server

MCP (Model Context Protocol) server for ProjectFlow. A task-focused MCP server that keeps AI agents locked to their current task, records all actions as events, enforces quality gates, and provides both agents and humans with clear context about what's happening.

## Overview

This server implements the Model Context Protocol to allow LLMs like Claude to interact with ProjectFlow's task-focused project management system. It provides:

- **Tools (`pm.*`)** - Mutations and enforcement (task management, gates, scope checking)
- **Resources (`pm://`)** - Read-only structured views of project data
- **Prompts (`pm.*`)** - Workflow templates that guide agents through correct task loops

All tools use the `pm.*` prefix for consistency, and all resources use the `pm://` URI scheme.

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
  "name": "pm.create_project",
  "parameters": {
    "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "My Project"
  }
}
```

## Available Tools (pm.*)

All tools return JSON-serialized results. Errors are returned with a code and message.

### pm.create_project

Creates a new project with optional rules.

**Parameters:**
- `name` (required): Project name
- `description` (optional): Project description
- `rules` (optional): Project rules (JSONB object) - allowedPaths, forbiddenPaths, defaultGates, approvalTriggers
- `userId` (optional): User ID (falls back to MCP_USER_ID env var)

**Example:**
```json
{
  "name": "pm.create_project",
  "arguments": {
    "name": "Mobile App",
    "description": "iOS and Android app",
    "rules": {
      "allowedPaths": ["src/", "tests/"],
      "defaultGates": ["has_tests", "has_artifacts:minCount=1"]
    }
  }
}
```

### pm.list_projects

Lists all projects for the user.

**Parameters:**
- `userId` (optional): User ID (falls back to MCP_USER_ID env var)

### pm.create_task

Creates a new task in a project with acceptance criteria, constraints, and dependencies.

**Parameters:**
- `projectId` (required): Project ID
- `title` (required): Task title
- `description` (optional): Task description
- `status` (optional): 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled' (default: 'todo')
- `priority` (optional): 'low' | 'medium' | 'high'
- `acceptanceCriteria` (optional): Array of acceptance criteria strings
- `constraints` (optional): Task constraints (allowedPaths, forbiddenPaths, maxFiles, etc.)
- `dependencies` (optional): Array of task IDs that must be completed before this task
- `userId` (optional): User ID

**Example:**
```json
{
  "name": "pm.create_task",
  "arguments": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Implement user authentication",
    "acceptanceCriteria": [
      "User can sign up with email",
      "User can log in",
      "Password reset works"
    ],
    "constraints": {
      "allowedPaths": ["src/auth/"],
      "maxFiles": 10
    },
    "priority": "high"
  }
}
```

### pm.list_tasks

Lists tasks in a project with optional filters.

**Parameters:**
- `projectId` (required): Project ID
- `status` (optional): Filter by status ('todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled')
- `priority` (optional): Filter by priority ('low' | 'medium' | 'high')
- `userId` (optional): User ID

### pm.update_task

Updates an existing task.

**Parameters:**
- `taskId` (required): Task ID
- `title` (optional): New title
- `description` (optional): New description
- `status` (optional): New status
- `priority` (optional): New priority
- `userId` (optional): User ID

### pm.get_context

Gets complete project context including project, tasks, latest checkpoint, and active task.

**Parameters:**
- `projectId` (required): Project ID
- `userId` (optional): User ID

**Response includes:**
- Project details and rules
- All tasks with their status
- Latest checkpoint (if any)
- Active task (if any locked)
- Latest session (if any)

### pm.pick_next_task

Picks and locks the next available task for a project based on strategy.

**Parameters:**
- `projectId` (required): Project ID
- `strategy` (optional): Task picking strategy - 'priority' | 'dependencies' | 'oldest' | 'newest' (default: 'dependencies')
- `lockedBy` (optional): Identifier for the agent/session locking the task
- `userId` (optional): User ID

**Returns:** The picked and locked task, or null if no tasks available.

**Note:** This locks the task (sets `locked_at` and `locked_by`). The task must be started with `pm.start_task` before work begins.

### pm.start_task

Starts a task that has been picked/locked.

**Parameters:**
- `taskId` (required): Task ID to start
- `userId` (optional): User ID

**Note:** The task must be locked (via `pm.pick_next_task`) before it can be started.

### pm.block_task

Blocks a task with a reason, optionally requiring human intervention.

**Parameters:**
- `taskId` (required): Task ID to block
- `reason` (required): Reason for blocking the task
- `needsHuman` (optional): Whether human intervention is required (default: false)
- `userId` (optional): User ID

### pm.append_artifact

Appends an artifact to a task (diff, PR, test report, document, etc.).

**Parameters:**
- `taskId` (required): Task ID
- `type` (required): Artifact type - 'diff' | 'pr' | 'test_report' | 'document' | 'other'
- `ref` (required): Artifact reference (URL, path, identifier)
- `summary` (optional): Artifact summary
- `userId` (optional): User ID

**Example:**
```json
{
  "name": "pm.append_artifact",
  "arguments": {
    "taskId": "650e8400-e29b-41d4-a716-446655440001",
    "type": "diff",
    "ref": "https://github.com/user/repo/pull/123",
    "summary": "Implemented user authentication with email/password"
  }
}
```

### pm.evaluate_gates

Evaluates quality gates for a task and returns pass/fail status with missing requirements.

**Parameters:**
- `taskId` (required): Task ID to evaluate gates for
- `userId` (optional): User ID

**Returns:** Array of gate evaluation results, each with:
- `passed`: boolean
- `gate`: Gate configuration
- `reason`: Explanation of the result
- `missingRequirements`: Array of missing requirements (if failed)

**Gate types:**
- `has_tests` - Task must have test artifacts
- `has_docs` - Task must have documentation
- `has_artifacts` - At least N artifacts required (configurable minCount)
- `acceptance_met` - All acceptance criteria checked

**Example response:**
```json
[
  {
    "passed": true,
    "gate": { "type": "has_tests" },
    "reason": "Found 2 test artifact(s)"
  },
  {
    "passed": false,
    "gate": { "type": "has_docs" },
    "reason": "No document artifacts found",
    "missingRequirements": ["document artifact"]
  }
]
```

### pm.complete_task

Completes a task after verifying gates pass and artifacts are attached.

**Parameters:**
- `taskId` (required): Task ID to complete
- `artifactIds` (optional): Array of artifact IDs to verify (if not provided, checks all artifacts)
- `userId` (optional): User ID

**Note:** This will:
1. Evaluate all gates (must pass)
2. Verify artifacts are attached
3. Update status to 'done'
4. Release the lock
5. Emit TaskCompleted event

### pm.create_checkpoint

Creates a checkpoint (resumable project snapshot) with git reference and resume instructions.

**Parameters:**
- `projectId` (required): Project ID
- `label` (required): Checkpoint label
- `repoRef` (optional): Git reference (commit, branch, tag)
- `summary` (required): Human-readable summary of project state
- `resumeInstructions` (optional): Instructions for resuming work from this checkpoint
- `userId` (optional): User ID

**Example:**
```json
{
  "name": "pm.create_checkpoint",
  "arguments": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "label": "Milestone 1: Authentication Complete",
    "repoRef": "main",
    "summary": "Completed user authentication feature. All tests passing. Ready for review.",
    "resumeInstructions": "Next: Implement user profile management. Start with pm.pick_next_task to get the next task."
  }
}
```

### pm.record_decision

Records a key architectural or design decision for a project.

**Parameters:**
- `projectId` (required): Project ID
- `title` (required): Decision title
- `options` (required): Array of options that were considered
- `choice` (required): The option that was selected
- `rationale` (required): Explanation of why this choice was made
- `userId` (optional): User ID

**Example:**
```json
{
  "name": "pm.record_decision",
  "arguments": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Database Choice",
    "options": ["PostgreSQL", "MongoDB", "SQLite"],
    "choice": "PostgreSQL",
    "rationale": "PostgreSQL provides ACID compliance and strong relational features needed for this project."
  }
}
```

### pm.assert_in_scope

Asserts that a changeset is within the allowed scope for a task (enforces "leash" constraints).

**Parameters:**
- `taskId` (required): Task ID to check scope for
- `changesetManifest` (required): Changeset manifest with file changes
  - `filesChanged`: Array of file paths that were changed
  - `filesAdded`: Array of file paths that were added
  - `filesDeleted`: Array of file paths that were deleted
- `userId` (optional): User ID

**Returns:**
- `allowed`: boolean
- `reason`: Explanation
- `violations`: Array of violation messages (if not allowed)

**Example:**
```json
{
  "name": "pm.assert_in_scope",
  "arguments": {
    "taskId": "650e8400-e29b-41d4-a716-446655440001",
    "changesetManifest": {
      "filesChanged": ["src/auth/login.ts"],
      "filesAdded": ["src/auth/login.test.ts"],
      "filesDeleted": []
    }
  }
}
```

**Important:** Agents should call `pm.assert_in_scope` **before** applying edits to ensure they stay within the task's allowed scope.

## Resources (pm://)

Resources provide read-only structured views of project data. All resources use the `pm://` URI scheme.

### Static Resources

#### pm://projects

List of all projects for the user.

**Content:** JSON array of project objects.

### Dynamic Resources

#### pm://project/{projectId}

Project details including rules and metadata.

**Content:** JSON object with project details.

#### pm://project/{projectId}/tasks

All tasks for a project (filterable via query parameters).

**Query parameters:**
- `status`: Filter by status ('todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled')
- `priority`: Filter by priority ('low' | 'medium' | 'high')

**Example:** `pm://project/{projectId}/tasks?status=in_progress`

**Content:** JSON array of task objects.

#### pm://task/{taskId}

Task details with acceptance criteria, constraints, dependencies, and artifacts.

**Content:** JSON object with task details and associated artifacts.

#### pm://task/{taskId}/events

Event timeline for a specific task.

**Content:** JSON array of event objects, ordered by creation time (newest first).

#### pm://checkpoint/{checkpointId}

Checkpoint details including snapshot, summary, and resume instructions.

**Content:** JSON object with checkpoint details.

#### pm://project/{projectId}/timeline

Full event timeline for a project.

**Content:** JSON array of event objects, ordered by creation time (newest first).

#### pm://project/{projectId}/decisions

Decision log for a project.

**Content:** JSON array of decision objects.

## Prompts (pm.*)

Prompts provide workflow templates that guide agents through correct task loops. Prompts enforce the correct agent workflow and help maintain focus.

### pm.task_focus_mode

Enter focus mode for a task. This prompt restates task criteria and guides the agent through the work → artifacts → gates → checkpoint loop.

**Arguments:**
- `taskId` (required): Task ID to focus on

**Template includes:**
- Task acceptance criteria
- Task constraints (scope limits)
- Instructions to call `pm.assert_in_scope` before edits
- Workflow: work → artifacts → gates → checkpoint

### pm.resume_from_checkpoint

Resume work from a checkpoint. Loads checkpoint context and presents resume instructions.

**Arguments:**
- `checkpointId` (required): Checkpoint ID to resume from

**Template includes:**
- Checkpoint summary
- Resume instructions
- Suggested next tasks
- Project state snapshot

### pm.propose_tasks_from_goal

Generate task breakdown from a high-level goal. Applies project constraints and returns proposed tasks for human approval.

**Arguments:**
- `projectId` (required): Project ID
- `goal` (required): High-level goal description
- `constraints` (optional): Additional constraints to apply

**Template includes:**
- Task breakdown suggestions
- Dependencies between tasks
- Acceptance criteria suggestions
- Scope constraints

### pm.write_status_update

Generate a human-readable status report for a project.

**Arguments:**
- `projectId` (required): Project ID

**Template includes:**
- Recent events summary
- Completed tasks
- Active tasks
- Blockers
- Next tasks
- Latest checkpoint

## The "Stay on Task" Loop

The recommended workflow for AI agents:

1. **Get Context**: `pm.get_context(projectId)` - Understand current project state
2. **Pick Task**: `pm.pick_next_task(projectId)` - Get and lock the next available task
3. **Start Task**: `pm.start_task(taskId)` - Begin working on the task
4. **Before Edits**: `pm.assert_in_scope(taskId, changesetManifest)` - Verify scope
5. **Work & Artifacts**: Make changes and `pm.append_artifact(taskId, ...)` for outputs
6. **Evaluate Gates**: `pm.evaluate_gates(taskId)` - Check quality gates
7. **Complete Task**: `pm.complete_task(taskId)` - Only if gates pass
8. **Create Checkpoint**: `pm.create_checkpoint(projectId, ...)` - Save progress
9. **Repeat**: Go back to step 1 for the next task

**Key Rules:**
- Always call `pm.assert_in_scope` before making file changes
- Tasks can't be completed unless gates pass
- Artifacts must be attached before completion
- Checkpoints should be created after completing significant work

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

Run unit and integration tests:

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

### Test Coverage

Tests cover:
- Gate evaluator logic
- Scope checker logic
- Event store operations
- MCP tool implementations (end-to-end)

## Architecture

The server is organized into layers:

- **tools.ts** - Tool schema definitions (all `pm.*` tools)
- **resources.ts** - Resource handlers (all `pm://` resources)
- **prompts.ts** - Prompt templates (all `pm.*` prompts)
- **auth.ts** - User ID resolution and validation
- **errors.ts** - Error mapping to MCP responses
- **toolImplementations.ts** - Business logic wrapping core services
- **handlers.ts** - MCP request handlers
- **config.ts** - Configuration management
- **logger.ts** - Logging utilities
- **index.ts** - Server entry point

## Integration with MCP Clients

The MCP server can be used via HTTP with OAuth 2.1 authentication. For Cursor and other MCP clients:

### HTTP Configuration (Recommended)

```json
{
  "mcpServers": {
    "projectflow": {
      "url": "https://your-app.vercel.app/api/mcp"
    }
  }
}
```

**OAuth Authentication**: When the client first connects, it will automatically trigger the OAuth flow. No tokens need to be stored in the configuration.

### Stdio Configuration (Legacy)

For stdio-based MCP servers (local development):

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

**Note**: Stdio mode requires manual user ID configuration. HTTP mode with OAuth is recommended for production use.

## Event Sourcing

All state changes are recorded as events in an append-only event log. Events are the source of truth - all state can be reconstructed from the event log.

**Event Types:**
- `ProjectCreated`
- `TaskCreated`
- `TaskStarted`
- `TaskBlocked`
- `TaskCompleted`
- `TaskCancelled`
- `ArtifactProduced`
- `GateEvaluated`
- `CheckpointCreated`
- `DecisionRecorded`
- `ScopeAsserted`

Events can be queried via resources:
- `pm://project/{projectId}/timeline` - All project events
- `pm://task/{taskId}/events` - Task-specific events

## Quality Gates

Quality gates enforce standards before tasks can be completed. Gates are evaluated automatically when:
- `pm.evaluate_gates` is called
- `pm.complete_task` is called (gates must pass)

**Default Gates** (if not specified in project rules):
- `has_artifacts` (minCount: 1)
- `acceptance_met`

**Project Rules** can specify custom default gates:
```json
{
  "defaultGates": [
    "has_tests",
    "has_docs",
    "has_artifacts:minCount=2"
  ]
}
```

## Scope Enforcement ("Leash")

Tasks can have constraints that limit what files can be changed:

- `allowedPaths`: Array of allowed file path patterns
- `forbiddenPaths`: Array of forbidden file path patterns
- `maxFiles`: Maximum number of files that can be changed

**Project Rules** can specify default constraints that apply to all tasks:
```json
{
  "allowedPaths": ["src/", "tests/"],
  "forbiddenPaths": ["node_modules/", ".git/"]
}
```

**Task Constraints** override project rules for specific tasks.

Agents must call `pm.assert_in_scope` before making changes to verify they stay within scope.
