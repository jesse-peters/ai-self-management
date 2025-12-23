# Task-Focused MCP Server Specification

## Goal

Provide an MCP server that:

- Keeps an LLM agent (Cursor) locked to the current task
- Records progress as an event log
- Exposes tasks/projects/checkpoints/artifacts
- Gives humans a clean "what's happening?" view

## MCP Surfaces

### 1) Tools (pm.*) = mutations + enforcement

Use tools for any state change / command.

#### Core Tools

- **`pm.get_context(projectId?)`** → project rules + active task + next tasks + last checkpoint
- **`pm.list_projects()`**
- **`pm.create_project(name, rules)`**
- **`pm.list_tasks(projectId, filter?)`**
- **`pm.create_task(projectId, title, acceptanceCriteria, constraints, deps?)`**
- **`pm.pick_next_task(projectId, strategy?)`** → returns taskId + locks it
- **`pm.start_task(taskId)`**
- **`pm.block_task(taskId, reason, needsHuman)`**
- **`pm.append_artifact(taskId, {type, ref, summary})`**
- **`pm.evaluate_gates(taskId)`** → pass/fail + missing requirements
- **`pm.complete_task(taskId, artifacts[])`** → only if gates pass
- **`pm.create_checkpoint(projectId, label, repoRef, summary, resumeInstructions)`**
- **`pm.record_decision(projectId, title, options, choice, rationale)`**
- **`pm.assert_in_scope(taskId, changesetManifest)`** → ok / deny with reason ("leash")

#### Key Behavior

- Agents must call `pm.assert_in_scope` before applying edits.
- Tasks can't become done unless `pm.evaluate_gates` passes and artifacts are attached.

### 2) Resources (pm://…) = read-only state views

Use resources so Cursor/humans can read structured context.

#### Suggested URIs

- `pm://projects`
- `pm://project/{projectId}`
- `pm://project/{projectId}/tasks?status=in_progress`
- `pm://task/{taskId}`
- `pm://task/{taskId}/events`
- `pm://checkpoint/{checkpointId}`
- `pm://project/{projectId}/timeline`

### 3) Prompts (pm.*) = workflow templates

Prompts enforce the correct agent loop.

- **`pm.task_focus_mode(taskId)`** → restate criteria → work → artifacts → gates → checkpoint
- **`pm.resume_from_checkpoint(checkpointId)`**
- **`pm.propose_tasks_from_goal(goal, constraints)`**
- **`pm.write_status_update(projectId)`** (human-facing)

## Data Model (Minimal)

Store in SQLite/Postgres, but event log is the source of truth.

### Tables/Entities

#### Projects

- `id` (UUID)
- `user_id` (UUID)
- `name` (text)
- `description` (text, optional)
- `rules` (JSONB) - allowed paths, forbidden paths, approval triggers, default gates
- `created_at`, `updated_at` (timestamps)

#### Tasks

- `id` (UUID)
- `project_id` (UUID)
- `user_id` (UUID)
- `title` (text)
- `description` (text, optional)
- `acceptance_criteria` (text[]) - list of requirements
- `constraints` (JSONB) - scope limits, allowed file paths, etc.
- `dependencies` (UUID[]) - array of task IDs that must complete first
- `status` (enum: 'todo', 'in_progress', 'blocked', 'done', 'cancelled')
- `priority` (enum: 'low', 'medium', 'high')
- `locked_at` (timestamp, nullable) - when task was picked/started
- `locked_by` (text, nullable) - which session/agent locked it
- `created_at`, `updated_at` (timestamps)

#### Events

Append-only log of all actions. The source of truth.

- `id` (UUID)
- `project_id` (UUID)
- `task_id` (UUID, nullable)
- `user_id` (UUID)
- `event_type` (text) - e.g., 'TaskStarted', 'ArtifactProduced', 'GateFailed', 'CheckpointCreated'
- `payload` (JSONB) - event-specific data
- `created_at` (timestamp)

Example event types:
- `ProjectCreated`
- `TaskCreated`
- `TaskStarted`
- `TaskBlocked`
- `TaskCompleted`
- `ArtifactProduced`
- `GateEvaluated`
- `CheckpointCreated`
- `DecisionRecorded`
- `ScopeAsserted`

#### Artifacts

References to outputs produced during task work.

- `id` (UUID)
- `task_id` (UUID)
- `user_id` (UUID)
- `type` (enum: 'diff', 'pr', 'test_report', 'document', 'other')
- `ref` (text) - URL, file path, or identifier
- `summary` (text) - brief description
- `created_at` (timestamp)

#### Checkpoints

Resumable snapshots of project state.

- `id` (UUID)
- `project_id` (UUID)
- `user_id` (UUID)
- `label` (text) - human-readable name
- `repo_ref` (text) - git commit, branch, or tag
- `summary` (text) - what was accomplished
- `resume_instructions` (text) - how to continue from here
- `snapshot` (JSONB) - full state context
- `created_at` (timestamp)

#### Decisions

Record of key decisions made during development.

- `id` (UUID)
- `project_id` (UUID)
- `user_id` (UUID)
- `title` (text)
- `options` (JSONB) - array of options considered
- `choice` (text) - option selected
- `rationale` (text) - why this choice
- `created_at` (timestamp)

## The "Stay on Task" Loop

1. `pm.get_context`
2. `pm.pick_next_task` + `pm.start_task`
3. Before edits: `pm.assert_in_scope(changeset)`
4. Work + attach outputs: `pm.append_artifact`
5. `pm.evaluate_gates`
6. `pm.complete_task`
7. `pm.create_checkpoint`
8. Humans read `pm://…/timeline` + last checkpoint

## Cursor Hookup

Add server to `mcp.json` (either local stdio or remote HTTP). The key is: Cursor uses `pm.*` tools + reads `pm://…` resources for context.

Example configuration:

```json
{
  "mcpServers": {
    "projectflow": {
      "url": "https://your-app.vercel.app/api/mcp"
    }
  }
}
```

## Implementation Notes

- Events are the source of truth - all state can be reconstructed from event log
- Tasks have a "leash" via `pm.assert_in_scope` to prevent scope creep
- Gates enforce quality standards before task completion
- Checkpoints enable resuming work across sessions
- Resources provide read-only views for both agents and humans
- Prompts guide agents through the correct workflow

