# Plan Mode Service

The Plan Mode Service enables local plan files with stable task keys for coordinating work in Cursor and other IDEs. This service provides parsing, validation, import, and export functionality for plan files.

## Overview

Plan Mode allows developers to:
- Define work items and tasks in a human-readable markdown format
- Use stable task keys (e.g., `task-001`, `task-fix-auth`) for consistent reference
- Track expected and touched files for each task
- Define subtasks and gates for quality assurance
- Synchronize plan files with the database

## Plan File Format

Plan files use markdown with a structured format:

```markdown
# Work Item Title

Description of the work item

## Definition of Done
- Acceptance criteria 1
- Acceptance criteria 2

## Tasks

### task-001: First Task Title
Goal: Clear description of what needs to be done
Type: implement
Timebox: 30
Risk: medium
Dependencies: task-002, task-003
Expected Files: src/auth.ts, src/auth.test.ts

### task-002: Research Task
Goal: Investigate the approach
Type: research
Timebox: 15
Risk: low

#### Subtasks
- sub-1: Subtask one
- sub-2: Subtask two

#### Gates
- test
- lint
```

## API Reference

### Types

#### `WorkItemPlan`
```typescript
interface WorkItemPlan {
  version: string;
  workItemId?: string;
  title: string;
  description?: string;
  definitionOfDone?: string;
  tasks: PlanTaskDefinition[];
}
```

#### `PlanTaskDefinition`
```typescript
interface PlanTaskDefinition {
  key: string; // e.g., "task-001", "task-fix-auth"
  title: string;
  goal: string;
  type: 'research' | 'implement' | 'verify' | 'docs' | 'cleanup';
  context?: string;
  expectedFiles?: string[];
  subtasks?: Array<{
    key: string;
    title: string;
    status?: 'ready' | 'doing' | 'blocked' | 'done';
    dependencies?: string[];
  }>;
  gates?: string[];
  dependencies?: string[];
  timebox?: number; // Minutes
  risk?: 'low' | 'medium' | 'high';
}
```

### Functions

#### `parsePlan(planText: string): WorkItemPlan`
Parses a plan file (markdown format) into a structured plan object.

**Parameters:**
- `planText` - Markdown plan file content

**Returns:** Parsed plan structure

**Throws:** `ValidationError` if plan format is invalid

**Example:**
```typescript
const planText = fs.readFileSync('plan.md', 'utf-8');
const plan = parsePlan(planText);
console.log(plan.tasks); // Array of parsed tasks
```

#### `validatePlan(plan: WorkItemPlan): PlanValidationResult`
Validates a parsed plan structure.

**Parameters:**
- `plan` - Parsed plan object

**Returns:**
```typescript
{
  valid: boolean;
  errors: string[];      // Critical validation errors
  warnings: string[];    // Non-critical warnings
}
```

**Example:**
```typescript
const result = validatePlan(plan);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

#### `importPlan(client: SupabaseClient, workItemId: string, planText: string): Promise<PlanImportResult>`
Imports a plan file for a work item, creating/updating tasks in the database.

**Parameters:**
- `client` - Authenticated Supabase client
- `workItemId` - Work item ID to import plan into
- `planText` - Markdown plan file content

**Returns:**
```typescript
{
  workItemId: string;
  workItem: WorkItem;
  tasksCreated: number;
  tasksUpdated: number;
  taskMappings: Array<{
    taskKey: string;
    taskId: string;
  }>;
}
```

**Throws:** `ValidationError` or `NotFoundError`

**Example:**
```typescript
const result = await importPlan(client, workItemId, planText);
console.log(`Created ${result.tasksCreated} tasks, updated ${result.tasksUpdated}`);
console.log(result.taskMappings); // Map task keys to IDs
```

#### `exportPlan(client: SupabaseClient, workItemId: string): Promise<PlanExportResult>`
Exports a work item's tasks as a plan file.

**Parameters:**
- `client` - Authenticated Supabase client
- `workItemId` - Work item ID to export

**Returns:**
```typescript
{
  plan: WorkItemPlan;
  content: string;  // Markdown representation
}
```

**Throws:** `NotFoundError` if work item not found

**Example:**
```typescript
const result = await exportPlan(client, workItemId);
fs.writeFileSync('plan.md', result.content);
```

#### `planToMarkdown(plan: WorkItemPlan): string`
Converts a plan object to markdown format.

**Parameters:**
- `plan` - Plan object to convert

**Returns:** Markdown representation as string

**Example:**
```typescript
const markdown = planToMarkdown(plan);
console.log(markdown);
```

## Database Integration

### New Columns in `agent_tasks` Table

The plan service uses the following columns added in the plan mode schema migration:

- **`task_key`** (TEXT, UNIQUE, NULLABLE)
  - Stable unique key for referencing tasks in plan files
  - Set during plan import for new tasks
  - Enables human-readable plan file references

- **`expected_files`** (TEXT[])
  - Array of file paths this task is expected to modify
  - Set from plan file "Expected Files" field

- **`touched_files`** (TEXT[])
  - Array of file paths actually modified by the task
  - Updated upon task completion

- **`subtasks`** (JSONB)
  - Array of subtask objects for complex tasks
  - Structure: `[{key, title, status, dependencies}, ...]`

- **`gates`** (JSONB)
  - Array of gate names that must pass for task completion
  - Structure: `["test", "lint", "type-check"]`

### New Column in `work_items` Table

- **`definition_of_done`** (TEXT, NULLABLE)
  - Acceptance criteria that defines when work item is complete
  - Set from plan file "Definition of Done" section

## Features

### Plan Parsing
- Extracts work item metadata (title, description, definition of done)
- Parses all task definitions with full metadata
- Validates format and structure
- Provides helpful error messages

### Task Key Management
- Auto-generates stable keys if not provided
- Ensures uniqueness across work item
- Enables consistent cross-session references

### Dependency Resolution
- Automatically resolves task key dependencies to task IDs
- Validates all dependencies exist in the plan
- Prevents circular dependencies

### Validation
- Validates required fields (title, goal, type)
- Checks task types are valid
- Ensures all referenced dependencies exist
- Provides warnings for pattern violations

### Round-trip Conversion
- Parse markdown → export back to markdown
- Preserves task structure and metadata
- Enables round-trip workflows

## Usage Examples

### Import a Plan

```typescript
import { importPlan } from '@projectflow/core';
import { createClient } from '@supabase/supabase-js';

const client = createClient(url, key);
const planText = fs.readFileSync('my-plan.md', 'utf-8');

const result = await importPlan(client, workItemId, planText);
console.log(`Successfully imported plan with ${result.tasksCreated} new tasks`);
```

### Export a Plan

```typescript
import { exportPlan } from '@projectflow/core';

const result = await exportPlan(client, workItemId);
fs.writeFileSync('exported-plan.md', result.content);
```

### Validate a Plan

```typescript
import { parsePlan, validatePlan } from '@projectflow/core';

const plan = parsePlan(planText);
const validation = validatePlan(plan);

if (!validation.valid) {
  validation.errors.forEach(err => console.error(`❌ ${err}`));
  process.exit(1);
}

validation.warnings.forEach(warn => console.warn(`⚠️  ${warn}`));
```

## Best Practices

1. **Use consistent task key prefixes**: `task-001`, `task-002` or `task-fix-auth`, `task-setup-db`

2. **Keep tasks focused**: Each task should have a single, clear goal

3. **Set realistic timeboxes**: Use actual effort estimates, not wishes

4. **Document dependencies**: Clearly show which tasks depend on others

5. **Track expected files**: List all files a task will create/modify

6. **Use descriptive gates**: Clear gate names like "unit-tests", "integration-tests", "type-check"

## Testing

The service includes comprehensive tests covering:
- Basic plan parsing with multiple tasks
- Validation of plan structure
- Error handling for invalid plans
- Round-trip conversion (parse → export → parse)
- Subtask parsing
- Gate extraction
- Dependency resolution

Run tests with:
```bash
pnpm test packages/core/src/services/__tests__/plan.test.ts
```

## Error Handling

### ValidationError
- Thrown when plan format is invalid
- Includes specific error message identifying the issue
- Examples:
  - "Plan must start with a title (# Title)"
  - "Plan must contain at least one task"
  - "Task must have a goal"

### NotFoundError
- Thrown when work item or dependency not found in database

### Database Errors
- Mapped through `mapSupabaseError` utility
- Includes descriptive error messages

## Performance Considerations

- Plan parsing is O(n) in the number of lines
- Validation is O(m) where m = number of tasks
- Import requires multiple database queries (one per task)
- For large plans (>100 tasks), consider batching imports
- Indexes on `task_key` and file arrays enable efficient queries

## Future Enhancements

Planned improvements:
- Support for plan templates
- Automatic dependency graph visualization
- Plan mode integration with Cursor IDE
- Plan versioning and history
- Concurrent task import optimization
- Plan conflict resolution for team collaboration

