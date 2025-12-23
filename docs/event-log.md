# Event Log Architecture

ProjectFlow uses event sourcing as its core architecture. All state changes are recorded as events in an append-only event log. Events are the source of truth - all state can be reconstructed from the event log.

## Overview

### What is Event Sourcing?

Event sourcing is an architectural pattern where:
- **Events** are the source of truth
- All state changes are recorded as events
- Current state is derived by replaying events
- Events are immutable and append-only

### Why Event Sourcing?

**Benefits:**
- **Complete Audit Trail** - Every action is recorded
- **Time Travel** - Reconstruct state at any point in time
- **Debugging** - See exactly what happened and when
- **Analytics** - Analyze patterns and trends
- **Compliance** - Full history for regulatory requirements

**In ProjectFlow:**
- Track all agent actions
- Understand project evolution
- Debug issues by reviewing events
- Provide visibility to humans
- Enable resumable sessions via checkpoints

## Event Structure

All events follow this base structure:

```typescript
interface BaseEvent {
  id: string;                    // Unique event ID (UUID)
  project_id: string;            // Project this event belongs to
  task_id?: string | null;       // Task this event relates to (if applicable)
  user_id: string;               // User who triggered the event
  event_type: EventType;         // Type of event
  payload: Record<string, any>;  // Event-specific data
  created_at: string;            // ISO timestamp
}
```

## Event Types

### ProjectCreated

Emitted when a project is created.

**Payload:**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Mobile App",
  "description": "iOS and Android app",
  "rules": {
    "allowedPaths": ["src/"],
    "defaultGates": ["has_tests"]
  }
}
```

### TaskCreated

Emitted when a task is created.

**Payload:**
```json
{
  "task_id": "650e8400-e29b-41d4-a716-446655440001",
  "title": "Implement user authentication",
  "description": "Add email/password authentication",
  "status": "todo",
  "priority": "high",
  "acceptance_criteria": [
    "User can sign up with email",
    "User can log in"
  ],
  "constraints": {
    "allowedPaths": ["src/auth/"],
    "maxFiles": 10
  },
  "dependencies": []
}
```

### TaskStarted

Emitted when a task is started (moved to in_progress).

**Payload:**
```json
{
  "task_id": "650e8400-e29b-41d4-a716-446655440001",
  "locked_at": "2024-01-01T12:00:00Z",
  "locked_by": "agent-123"
}
```

### TaskBlocked

Emitted when a task is blocked.

**Payload:**
```json
{
  "task_id": "650e8400-e29b-41d4-a716-446655440001",
  "reason": "Waiting for API design approval",
  "needs_human": true
}
```

### TaskCompleted

Emitted when a task is completed.

**Payload:**
```json
{
  "task_id": "650e8400-e29b-41d4-a716-446655440001",
  "artifacts": [
    "750e8400-e29b-41d4-a716-446655440002",
    "750e8400-e29b-41d4-a716-446655440003"
  ]
}
```

### TaskCancelled

Emitted when a task is cancelled.

**Payload:**
```json
{
  "task_id": "650e8400-e29b-41d4-a716-446655440001",
  "reason": "Superseded by different approach"
}
```

### ArtifactProduced

Emitted when an artifact is created.

**Payload:**
```json
{
  "artifact_id": "750e8400-e29b-41d4-a716-446655440002",
  "task_id": "650e8400-e29b-41d4-a716-446655440001",
  "type": "diff",
  "ref": "https://github.com/user/repo/pull/123",
  "summary": "Implemented user authentication"
}
```

### GateEvaluated

Emitted when gates are evaluated for a task.

**Payload:**
```json
{
  "task_id": "650e8400-e29b-41d4-a716-446655440001",
  "gates": [
    {
      "type": "has_tests",
      "passed": true,
      "reason": "Found 2 test artifact(s)"
    },
    {
      "type": "has_docs",
      "passed": false,
      "reason": "No document artifacts found",
      "missingRequirements": ["document artifact"]
    }
  ]
}
```

### CheckpointCreated

Emitted when a checkpoint is created.

**Payload:**
```json
{
  "checkpoint_id": "850e8400-e29b-41d4-a716-446655440001",
  "label": "Milestone 1: Authentication Complete",
  "repo_ref": "main",
  "summary": "Completed user authentication feature. All tests passing.",
  "resume_instructions": "Next: Implement user profile management."
}
```

### DecisionRecorded

Emitted when a decision is recorded.

**Payload:**
```json
{
  "decision_id": "950e8400-e29b-41d4-a716-446655440001",
  "title": "Database Choice",
  "options": ["PostgreSQL", "MongoDB", "SQLite"],
  "choice": "PostgreSQL",
  "rationale": "PostgreSQL provides ACID compliance and strong relational features."
}
```

### ScopeAsserted

Emitted when scope is checked for a changeset.

**Payload:**
```json
{
  "task_id": "650e8400-e29b-41d4-a716-446655440001",
  "changeset": {
    "filesChanged": ["src/auth/login.ts"],
    "filesAdded": ["src/auth/login.test.ts"],
    "filesDeleted": []
  },
  "allowed": true,
  "reason": "All changes are within the allowed scope",
  "violations": null
}
```

## Querying Events

### Get Project Events

Get all events for a project:

```typescript
const events = await getProjectEvents(projectId, limit?: number);
```

**Returns:** Array of events, ordered by creation time (newest first).

**Use cases:**
- Project timeline view
- Audit trail
- Debugging project issues

### Get Task Events

Get all events for a specific task:

```typescript
const events = await getTaskEvents(taskId, limit?: number);
```

**Returns:** Array of events for the task, ordered by creation time (newest first).

**Use cases:**
- Task history
- Understanding task progression
- Debugging task issues

### Get Events Since

Get events created after a specific timestamp:

```typescript
const events = await getEventsSince(projectId, since: string, limit?: number);
```

**Use cases:**
- Event streaming
- Incremental updates
- Real-time monitoring

### Get Events By Type

Get events filtered by event type:

```typescript
const events = await getEventsByType(projectId, eventType: EventType, limit?: number);
```

**Use cases:**
- Find all task completions
- Find all blockers
- Analyze specific event patterns

### Get Single Event

Get a specific event by ID:

```typescript
const event = await getEvent(eventId);
```

**Returns:** Event object or null if not found.

## Accessing Events via Resources

Events can be accessed via MCP resources:

### Project Timeline
```
pm://project/{projectId}/timeline
```

Returns all events for a project as JSON.

### Task Events
```
pm://task/{taskId}/events
```

Returns all events for a specific task as JSON.

## Event Handlers

Event handlers subscribe to events and trigger side effects:

### Current Handlers

**Update Read Models:**
- When `TaskCreated` → Update tasks table
- When `TaskStarted` → Update task status and lock
- When `TaskCompleted` → Update task status and unlock
- When `TaskBlocked` → Update task status

**Future Handlers (planned):**
- Send notifications on blockers
- Update analytics
- Trigger webhooks
- Generate reports

### Handler Implementation

Event handlers are in `packages/core/src/events/eventHandlers.ts`:

```typescript
// Subscribe to events
onEvent('TaskCompleted', async (event) => {
  // Update read model
  await updateTaskStatus(event.task_id, 'done');
  
  // Send notification
  await notifyUser(event.user_id, `Task ${event.task_id} completed`);
});
```

## Reconstructing State

### From Events

Current state can be reconstructed by replaying events:

```typescript
// Get all events for a project
const events = await getProjectEvents(projectId);

// Reconstruct state
let state = {
  tasks: {},
  artifacts: {},
  checkpoints: [],
};

for (const event of events) {
  switch (event.event_type) {
    case 'TaskCreated':
      state.tasks[event.payload.task_id] = {
        id: event.payload.task_id,
        title: event.payload.title,
        status: event.payload.status,
        // ... other fields
      };
      break;
    case 'TaskCompleted':
      state.tasks[event.payload.task_id].status = 'done';
      break;
    // ... handle other event types
  }
}
```

### Checkpoints

Checkpoints store snapshots of state at specific points:

```typescript
const checkpoint = {
  snapshot: {
    tasks: [...],
    events: [...],
    created_at: '2024-01-01T12:00:00Z',
  },
  // ... other checkpoint fields
};
```

This allows:
- Fast state reconstruction (start from checkpoint)
- Resumable sessions
- Point-in-time recovery

## Best Practices

### Event Design

**Do:**
- Make events immutable
- Include all necessary context in payload
- Use descriptive event types
- Keep payloads focused and minimal

**Don't:**
- Store computed values (compute from events)
- Include sensitive data in events
- Create events for read operations
- Modify events after creation

### Querying

**Do:**
- Use appropriate limits to avoid loading too much data
- Filter by event type when possible
- Use `getEventsSince` for incremental updates
- Cache frequently accessed events

**Don't:**
- Load all events for large projects
- Query events in tight loops
- Store events in memory unnecessarily

### Debugging

**Do:**
- Review event timeline to understand what happened
- Check task events to see task progression
- Look for patterns in event types
- Use checkpoints to understand state at specific points

**Don't:**
- Modify events directly
- Delete events (they're append-only)
- Rely solely on read models (events are source of truth)

## Example: Understanding a Task's Journey

```typescript
// Get all events for a task
const events = await getTaskEvents(taskId);

// Timeline:
// 1. TaskCreated - Task created with acceptance criteria
// 2. TaskStarted - Agent picked and started the task
// 3. ScopeAsserted - Agent checked scope before changes
// 4. ArtifactProduced - Agent created a diff artifact
// 5. ArtifactProduced - Agent created a test report
// 6. GateEvaluated - Gates evaluated (passed)
// 7. TaskCompleted - Task completed successfully
```

This provides complete visibility into:
- What happened
- When it happened
- Who did it
- Why (from payloads)

## Summary

Event sourcing in ProjectFlow provides:
- **Complete History** - Every action is recorded
- **Audit Trail** - Full accountability
- **Debugging** - Understand what happened
- **Analytics** - Analyze patterns
- **Resumability** - Checkpoints enable session resumption

Events are the source of truth. All state can be reconstructed from events, making the system reliable, debuggable, and auditable.

