# Event Type Reference

This document defines all event types in the ProjectFlow event log system.

## Event Types

### Project Events

#### `ProjectCreated`
**When**: A new project is created
**Payload**:
```json
{
  "projectId": "uuid",
  "name": "string",
  "description": "string?",
  "rules": {}
}
```

### Task Events

#### `TaskCreated`
**When**: A new task is created
**Payload**:
```json
{
  "taskId": "uuid",
  "projectId": "uuid",
  "title": "string",
  "description": "string?",
  "acceptanceCriteria": ["string"],
  "constraints": {},
  "dependencies": ["uuid"],
  "priority": "low | medium | high"
}
```

#### `TaskStarted`
**When**: An agent starts working on a task (calls `pm.start_task`)
**Payload**:
```json
{
  "taskId": "uuid",
  "lockedBy": "string",
  "lockedAt": "timestamp"
}
```

#### `TaskBlocked`
**When**: A task is blocked and cannot proceed (calls `pm.block_task`)
**Payload**:
```json
{
  "taskId": "uuid",
  "reason": "string",
  "needsHuman": "boolean",
  "blockerDetails": {}
}
```

#### `TaskCompleted`
**When**: A task is successfully completed (calls `pm.complete_task`)
**Payload**:
```json
{
  "taskId": "uuid",
  "artifactIds": ["uuid"],
  "gateResults": [
    {
      "passed": true,
      "gate": {"type": "has_tests"},
      "reason": "string?"
    }
  ],
  "completedAt": "timestamp"
}
```

#### `TaskCancelled`
**When**: A task is cancelled and will not be completed
**Payload**:
```json
{
  "taskId": "uuid",
  "reason": "string"
}
```

### Artifact Events

#### `ArtifactProduced`
**When**: An artifact is attached to a task (calls `pm.append_artifact`)
**Payload**:
```json
{
  "artifactId": "uuid",
  "taskId": "uuid",
  "type": "diff | pr | test_report | document | other",
  "ref": "string",
  "summary": "string"
}
```

### Gate Events

#### `GateEvaluated`
**When**: Quality gates are evaluated for a task (calls `pm.evaluate_gates`)
**Payload**:
```json
{
  "taskId": "uuid",
  "results": [
    {
      "passed": "boolean",
      "gate": {
        "type": "has_tests | has_docs | has_artifacts | acceptance_met | custom",
        "config": {}
      },
      "reason": "string?",
      "missingRequirements": ["string"]
    }
  ],
  "overallPassed": "boolean"
}
```

### Checkpoint Events

#### `CheckpointCreated`
**When**: A project checkpoint is created (calls `pm.create_checkpoint`)
**Payload**:
```json
{
  "checkpointId": "uuid",
  "projectId": "uuid",
  "label": "string",
  "repoRef": "string",
  "summary": "string",
  "resumeInstructions": "string?",
  "snapshot": {}
}
```

### Decision Events

#### `DecisionRecorded`
**When**: An architectural decision is recorded (calls `pm.record_decision`)
**Payload**:
```json
{
  "decisionId": "uuid",
  "projectId": "uuid",
  "title": "string",
  "options": [
    {
      "name": "string",
      "pros": ["string"],
      "cons": ["string"]
    }
  ],
  "choice": "string",
  "rationale": "string"
}
```

### Scope Events

#### `ScopeAsserted`
**When**: Scope validation is performed (calls `pm.assert_in_scope`)
**Payload**:
```json
{
  "taskId": "uuid",
  "changeset": {
    "filesChanged": ["string"],
    "filesAdded": ["string"],
    "filesDeleted": ["string"]
  },
  "result": {
    "allowed": "boolean",
    "reason": "string?",
    "violations": ["string"]
  }
}
```

## Event Sourcing Patterns

### Query Patterns

**Get all events for a project (timeline)**:
```sql
SELECT * FROM events 
WHERE project_id = $1 
ORDER BY created_at DESC;
```

**Get all events for a task**:
```sql
SELECT * FROM events 
WHERE task_id = $1 
ORDER BY created_at ASC;
```

**Get events by type**:
```sql
SELECT * FROM events 
WHERE event_type = 'TaskCompleted'
AND project_id = $1
ORDER BY created_at DESC;
```

**Get recent events (last 24 hours)**:
```sql
SELECT * FROM events 
WHERE created_at > now() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### State Reconstruction

The current state of any entity can be reconstructed by replaying events:

```typescript
// Reconstruct task state from events
const events = await getTaskEvents(taskId);
let task = { status: 'todo' };

for (const event of events) {
  switch (event.event_type) {
    case 'TaskCreated':
      task = event.payload;
      break;
    case 'TaskStarted':
      task.status = 'in_progress';
      task.locked_at = event.payload.lockedAt;
      task.locked_by = event.payload.lockedBy;
      break;
    case 'TaskCompleted':
      task.status = 'done';
      task.locked_at = null;
      task.locked_by = null;
      break;
    // ... other events
  }
}

return task;
```

## Best Practices

1. **Always emit events** - Every state change should produce an event
2. **Events are immutable** - Never modify or delete events
3. **Rich payloads** - Include all relevant context in the payload
4. **Consistent naming** - Use past tense for event names (e.g., "TaskStarted" not "TaskStart")
5. **Timestamp everything** - Events have automatic `created_at` timestamps
6. **Link to entities** - Always include `project_id` and `task_id` when relevant
7. **Query efficiently** - Use indexes on `project_id`, `task_id`, `event_type`, and `created_at`

## Event Versioning

When event schemas need to change:

1. Add new fields to the payload (backward compatible)
2. Keep old fields for existing events
3. Handle both versions in event handlers
4. Document schema changes

Example:
```typescript
// V1: Simple reason
{ reason: "string" }

// V2: Structured reason (backward compatible)
{ 
  reason: "string",  // Keep for V1 compatibility
  reasonDetails: {   // New in V2
    category: "string",
    severity: "string"
  }
}
```

