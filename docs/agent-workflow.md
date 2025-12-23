# Agent Workflow Guide

This guide provides step-by-step instructions for AI agents using ProjectFlow's task-focused MCP server. Follow this workflow to stay focused on tasks, maintain quality, and provide clear visibility into your work.

## Overview

ProjectFlow enforces a task-focused workflow where agents:
1. Work on one task at a time (locked)
2. Record all actions as events
3. Enforce quality gates before completion
4. Stay within task scope constraints
5. Create checkpoints for resumable sessions

## The Core Loop

### 1. Get Project Context

Start by understanding the current project state:

```json
{
  "name": "pm.get_context",
  "arguments": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

This returns:
- Project details and rules
- All tasks with their status
- Latest checkpoint (if any)
- Active task (if any locked)
- Latest session (if any)

### 2. Pick Next Task

Get the next available task to work on:

```json
{
  "name": "pm.pick_next_task",
  "arguments": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "strategy": "dependencies"
  }
}
```

**Strategies:**
- `dependencies` (default) - Prefer tasks with dependencies met, oldest first
- `priority` - Sort by priority (high → medium → low)
- `oldest` - Oldest tasks first
- `newest` - Newest tasks first

**Note:** This locks the task. Only one agent can work on a locked task at a time.

### 3. Start the Task

Begin working on the locked task:

```json
{
  "name": "pm.start_task",
  "arguments": {
    "taskId": "650e8400-e29b-41d4-a716-446655440001"
  }
}
```

This moves the task to `in_progress` status and emits a `TaskStarted` event.

### 4. Review Task Details

Read the task resource to understand requirements:

```
pm://task/{taskId}
```

This provides:
- Acceptance criteria (what must be done)
- Constraints (scope limits - allowedPaths, forbiddenPaths, maxFiles)
- Dependencies (tasks that must complete first)
- Existing artifacts (if any)

### 5. Before Making Changes: Assert Scope

**CRITICAL:** Always call `pm.assert_in_scope` before making file changes to ensure you stay within the task's allowed scope:

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

**If scope check fails:**
- Review the violations
- Adjust your changeset to stay within allowed paths
- Do not proceed with changes outside scope

**If scope check passes:**
- Proceed with making the changes
- The changeset is recorded as a `ScopeAsserted` event

### 6. Do the Work

Make the necessary code changes, write tests, update documentation, etc.

### 7. Append Artifacts

Record all outputs as artifacts:

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

**Artifact Types:**
- `diff` - Code changes
- `pr` - Pull request
- `test_report` - Test results
- `document` - Documentation
- `other` - Other outputs

**Best Practice:** Append artifacts as you create them, not just at the end.

### 8. Evaluate Gates

Check if quality gates pass:

```json
{
  "name": "pm.evaluate_gates",
  "arguments": {
    "taskId": "650e8400-e29b-41d4-a716-446655440001"
  }
}
```

**Common Gates:**
- `has_tests` - Must have test artifacts
- `has_docs` - Must have documentation
- `has_artifacts` - Must have minimum number of artifacts
- `acceptance_met` - Acceptance criteria must be met

**If gates fail:**
- Review missing requirements
- Create missing artifacts (tests, docs, etc.)
- Re-evaluate gates
- Do not complete the task until all gates pass

**If gates pass:**
- Proceed to complete the task

### 9. Complete the Task

Only complete if gates pass:

```json
{
  "name": "pm.complete_task",
  "arguments": {
    "taskId": "650e8400-e29b-41d4-a716-446655440001"
  }
}
```

This will:
1. Verify gates pass (throws error if not)
2. Verify artifacts are attached
3. Update status to `done`
4. Release the lock
5. Emit `TaskCompleted` event

### 10. Create Checkpoint

After completing significant work, create a checkpoint:

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

**When to create checkpoints:**
- After completing a milestone
- Before switching to a different major feature
- At the end of a work session
- After resolving blockers

### 11. Repeat

Go back to step 1 to get the next task.

## Handling Blockers

If you encounter a blocker:

```json
{
  "name": "pm.block_task",
  "arguments": {
    "taskId": "650e8400-e29b-41d4-a716-446655440001",
    "reason": "Waiting for API design approval",
    "needsHuman": true
  }
}
```

**When to block:**
- Need human input or approval
- Dependencies are not ready
- Technical blockers discovered
- Scope clarification needed

**After blocking:**
- Pick a different task (if available)
- Or wait for human intervention

## Recording Decisions

When making architectural or design decisions:

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

**When to record decisions:**
- Choosing between technical options
- Making architectural choices
- Selecting libraries or frameworks
- Defining patterns or conventions

## Using Resources for Context

Read resources to understand project state without making changes:

### Project Timeline
```
pm://project/{projectId}/timeline
```
See all events in chronological order.

### Task Events
```
pm://task/{taskId}/events
```
See all events for a specific task.

### Project Decisions
```
pm://project/{projectId}/decisions
```
Review past architectural decisions.

### Task Details
```
pm://task/{taskId}
```
Get full task context including artifacts.

## Using Prompts

Prompts provide workflow templates:

### Task Focus Mode
```
pm.task_focus_mode(taskId)
```
Enter focus mode for a specific task. Restates criteria and guides through the workflow.

### Resume from Checkpoint
```
pm.resume_from_checkpoint(checkpointId)
```
Resume work from a checkpoint. Loads context and resume instructions.

### Propose Tasks
```
pm.propose_tasks_from_goal(projectId, goal, constraints)
```
Generate task breakdown from a high-level goal.

### Status Update
```
pm.write_status_update(projectId)
```
Generate human-readable status report.

## Best Practices

### Stay Focused
- Work on one task at a time
- Don't pick a new task until the current one is complete or blocked
- Use `pm.assert_in_scope` before every change

### Record Everything
- Append artifacts as you create them
- Record decisions when making choices
- Create checkpoints regularly

### Maintain Quality
- Ensure gates pass before completing tasks
- Write tests for your code
- Update documentation
- Follow acceptance criteria

### Provide Visibility
- Create clear artifact summaries
- Write detailed checkpoint summaries
- Record clear decision rationales
- Use descriptive task descriptions

### Handle Errors Gracefully
- If scope check fails, adjust your approach
- If gates fail, create missing artifacts
- If blocked, clearly explain the blocker
- If task can't be completed, block it with reason

## Example: Complete Task Flow

```json
// 1. Get context
{"name": "pm.get_context", "arguments": {"projectId": "..."}}

// 2. Pick next task
{"name": "pm.pick_next_task", "arguments": {"projectId": "...", "strategy": "dependencies"}}

// 3. Start task
{"name": "pm.start_task", "arguments": {"taskId": "..."}}

// 4. Read task details
// Resource: pm://task/{taskId}

// 5. Assert scope before changes
{"name": "pm.assert_in_scope", "arguments": {
  "taskId": "...",
  "changesetManifest": {
    "filesChanged": ["src/auth/login.ts"],
    "filesAdded": ["src/auth/login.test.ts"],
    "filesDeleted": []
  }
}}

// 6. Make changes (code, tests, docs)

// 7. Append artifacts
{"name": "pm.append_artifact", "arguments": {
  "taskId": "...",
  "type": "diff",
  "ref": "https://github.com/.../pull/123",
  "summary": "Implemented login functionality"
}}

{"name": "pm.append_artifact", "arguments": {
  "taskId": "...",
  "type": "test_report",
  "ref": "test-results.json",
  "summary": "All tests passing"
}}

// 8. Evaluate gates
{"name": "pm.evaluate_gates", "arguments": {"taskId": "..."}}

// 9. Complete task (if gates pass)
{"name": "pm.complete_task", "arguments": {"taskId": "..."}}

// 10. Create checkpoint
{"name": "pm.create_checkpoint", "arguments": {
  "projectId": "...",
  "label": "Authentication Complete",
  "repoRef": "main",
  "summary": "Completed user authentication feature",
  "resumeInstructions": "Next: Implement user profile management"
}}
```

## Troubleshooting

### Task is already locked
- Another agent may be working on it
- Check `pm://task/{taskId}` to see who locked it
- Pick a different task

### Scope check fails
- Review task constraints: `pm://task/{taskId}`
- Adjust your changeset to stay within allowed paths
- If scope is too restrictive, block the task and request scope adjustment

### Gates fail
- Review missing requirements from gate evaluation
- Create the missing artifacts (tests, docs, etc.)
- Re-evaluate gates

### No tasks available
- All tasks may be completed
- All tasks may be blocked
- All tasks may have unmet dependencies
- Check project context: `pm.get_context`

## Summary

The key to success with ProjectFlow is:
1. **Focus** - One task at a time
2. **Scope** - Always assert before changes
3. **Quality** - Gates must pass
4. **Visibility** - Record everything
5. **Resumability** - Create checkpoints

Follow this workflow, and you'll maintain high quality while providing clear visibility into your work.

