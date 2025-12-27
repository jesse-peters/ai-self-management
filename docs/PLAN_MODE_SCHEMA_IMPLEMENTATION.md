# Plan Mode Schema Implementation - Completion Report

## ✅ Task: plan-mode-schema

**Status**: COMPLETED

### Summary

Successfully implemented the database schema columns required for Phase 2 Plan Mode support. This enables local plan files with stable task keys and file tracking.

---

## Changes Made

### 1. Database Migration

**File**: `/packages/db/supabase/migrations/20251227000002_plan_mode_schema.sql`

#### Agent Tasks Table Changes

Added the following columns to support plan mode:

- **`task_key`** (TEXT, UNIQUE, NULLABLE)

  - Stable unique key for referencing tasks in plan files (e.g., "task-001", "task-fix-auth")
  - Used to map plan file tasks to database records consistently across sessions
  - Unique constraint ensures one key per task

- **`expected_files`** (TEXT[], DEFAULT: empty array)

  - Array of file paths this task is expected to modify or create
  - Used for specification and validation of task scope

- **`touched_files`** (TEXT[], DEFAULT: empty array)

  - Array of file paths actually modified by this task
  - Updated upon task completion to track actual work done
  - Used for validation that expected and actual files match

- **`subtasks`** (JSONB, DEFAULT: empty array)

  - Array of subtask objects for complex tasks
  - Structure: `[{key, title, status, dependencies}, ...]`
  - Enables task decomposition for large work items

- **`gates`** (JSONB, DEFAULT: empty array)
  - Array of gate names that must pass for task completion
  - Enables task-level quality gates (tests, lint checks, etc.)
  - Structure: `["test", "lint", "type-check"]`

#### Work Items Table Changes

Added the following column:

- **`definition_of_done`** (TEXT, NULLABLE)
  - Acceptance criteria that defines when work item is complete
  - Text-based specification of completion requirements
  - Complements task-level definitions for broader work item scope

#### Indexes Added

For optimal query performance on new columns:

- **`idx_agent_tasks_task_key`**: Unique index on task_key (WHERE NOT NULL)
  - Enables fast task lookup by key
- **`idx_agent_tasks_expected_files`**: GIN index on expected_files array
  - Enables efficient queries on file path arrays
- **`idx_agent_tasks_touched_files`**: GIN index on touched_files array
  - Enables efficient queries on touched files
- **`idx_agent_tasks_subtasks`**: GIN index on subtasks JSONB
  - Enables efficient JSONB queries
- **`idx_agent_tasks_gates`**: GIN index on gates JSONB
  - Enables efficient gate lookup queries

---

### 2. TypeScript Types Update

**File**: `/packages/db/src/types.ts`

#### WorkItem Type Updated

```typescript
export type WorkItem = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  external_url: string | null;
  status: "open" | "in_progress" | "done";
  definition_of_done: string | null; // NEW
  created_at: string;
  updated_at: string;
};
```

#### AgentTask Type Updated

```typescript
export type AgentTask = {
  id: string;
  project_id: string;
  work_item_id: string | null;
  user_id: string;
  type: "research" | "implement" | "verify" | "docs" | "cleanup";
  title: string;
  goal: string;
  context: string | null;
  inputs: string | null;
  output_expectation: string | null;
  verification: string | null;
  status: "ready" | "doing" | "blocked" | "review" | "done";
  depends_on_ids: string[];
  risk: "low" | "medium" | "high";
  timebox_minutes: number;
  blocked_reason: string | null;
  locked_at: string | null;
  locked_by: string | null;
  task_key: string | null; // NEW
  expected_files: string[]; // NEW
  touched_files: string[]; // NEW
  subtasks: any; // JSONB               // NEW
  gates: any; // JSONB                  // NEW
  created_at: string;
  updated_at: string;
};
```

---

## Next Steps for Phase 2

### Database Type Generation

When ready to generate updated types from the Supabase schema:

```bash
pnpm db:generate-types
```

### Service Layer Enhancements

The new columns are backward-compatible. Existing service functions will continue to work:

- Optional fields allow updates without specifying them
- Default values ensure queries work on legacy tasks
- Existing RLS policies cover new columns automatically

### MCP Tool Implementation (Future)

When implementing plan mode tools, you can use:

- `pm.plan_import(work_item_id, plan_text_or_path)` - Parse and import plan files
- `pm.plan_export(work_item_id)` - Export task list as plan file

---

## Technical Details

### Design Decisions

1. **task_key as TEXT instead of UUID**

   - Enables human-readable plan files
   - Easier debugging and manual editing
   - Can be generated from task title or custom assigned

2. **expected_files and touched_files as arrays**

   - Simple, queryable data structure
   - GIN indexes provide efficient searches
   - Easy to compare for validation

3. **subtasks and gates as JSONB**

   - Flexible schema for complex structures
   - Can evolve without migrations
   - Queryable and indexable

4. **All new columns nullable/optional**
   - Backward compatible with existing tasks
   - No data migration required
   - Safe deployment without downtime

### Data Types

- **TEXT[]**: PostgreSQL array type for file paths
- **JSONB**: PostgreSQL JSON Binary type for structured data
- **UNIQUE INDEX with WHERE NOT NULL**: Allows multiple NULL values while enforcing uniqueness on non-NULL

---

## Compatibility

✅ **Backward Compatible**

- All new columns are optional (nullable or have defaults)
- Existing code continues to work unchanged
- No data migration required
- Safe deployment to production

✅ **RLS Secure**

- Inherits existing RLS policies from parent tables
- Service role can manage all columns
- User-scoped access maintained

✅ **Indexing Strategy**

- GIN indexes optimized for array/JSONB queries
- Unique index on task_key enables plan file references
- No performance penalties for legacy queries

---

## Verification Checklist

- [x] Migration file created: `20251227000002_plan_mode_schema.sql`
- [x] SQL syntax validated
- [x] All required columns added to agent_tasks
- [x] definition_of_done added to work_items
- [x] Appropriate indexes created
- [x] TypeScript types updated: `types.ts`
- [x] Column comments added for documentation
- [x] Backward compatibility maintained
- [x] RLS policies covered

---

## Files Modified

1. `/packages/db/supabase/migrations/20251227000002_plan_mode_schema.sql` (NEW)

   - 70 lines of SQL migration code

2. `/packages/db/src/types.ts` (UPDATED)
   - Added 5 new fields to AgentTask type
   - Added 1 new field to WorkItem type
   - All types correctly typed with nullable/array annotations

---

## Migration Status

**Ready for**:

- Local Supabase deployment
- Remote Supabase deployment via migration runner
- Type generation via `pnpm db:generate-types`

**Safe to deploy**: Yes - all changes are additive and backward compatible.
