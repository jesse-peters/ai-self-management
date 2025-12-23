# Database Migrations

This directory contains Supabase database migrations for ProjectFlow.

## Migration Files

1. **20241222215037_init.sql** - Initial schema with projects, tasks, and agent_sessions tables
2. **20251222223222_oauth_tokens.sql** - OAuth tokens for MCP access
3. **20251222230000_task_focused.sql** - Task-focused MCP enhancements

## Migration 003: Task-Focused MCP Server

The third migration (`20251222230000_task_focused.sql`) transforms ProjectFlow into a task-focused MCP server with event sourcing. This is a comprehensive enhancement that adds:

### New Tables

1. **events** - Append-only event log (source of truth)
   - Records all state changes as events
   - Indexed for efficient querying by project, task, type, and time
   - RLS enabled for user data isolation

2. **artifacts** - Task outputs
   - References to diffs, PRs, test reports, documents, etc.
   - Linked to tasks for tracking work products
   - Types: diff, pr, test_report, document, other

3. **checkpoints** - Resumable project snapshots
   - Captures project state at key milestones
   - Includes git references and resume instructions
   - Enables session continuity

4. **decisions** - Design decision records
   - Documents key architectural decisions
   - Includes options considered and rationale
   - Provides historical context

### Enhanced Tables

#### Projects
- Added `rules` (JSONB) - scope rules, default gates, approval triggers

#### Tasks
- Added `acceptance_criteria` (text[]) - list of requirements
- Added `constraints` (JSONB) - scope limits, allowed paths
- Added `dependencies` (UUID[]) - task dependencies
- Added `locked_at`, `locked_by` - task locking mechanism
- Expanded `status` enum - now includes 'blocked' and 'cancelled'

### Views

1. **active_tasks** - Tasks in progress or blocked with lock status
2. **recent_events** - Recent events with project/task context
3. **task_progress** - Task summary with artifact counts

### Features

- **Event Sourcing**: All state changes recorded as events
- **Task Locking**: Prevents concurrent work on same task
- **Scope Enforcement**: Constraints prevent scope creep
- **Quality Gates**: Requirements before task completion
- **Resumability**: Checkpoints enable session continuity
- **Audit Trail**: Complete history of all changes

## Applying Migrations

### Local Development

```bash
# Apply all migrations
cd packages/db
pnpm supabase db reset

# Or apply specific migration
pnpm supabase migration up
```

### Production (Vercel)

Migrations are automatically applied when you push to Supabase:

```bash
# Link to your project
pnpm supabase link --project-ref your-project-ref

# Push migrations
pnpm supabase db push
```

## After Migration

After applying the migration, you should:

1. **Regenerate TypeScript types**:
   ```bash
   cd packages/db
   pnpm generate-types
   ```

2. **Rebuild packages**:
   ```bash
   pnpm build
   ```

3. **Verify the schema**:
   ```bash
   pnpm supabase db diff
   ```

## Row Level Security (RLS)

All tables have RLS enabled with user-scoped policies:
- Users can only access their own data
- Events are append-only (no UPDATE/DELETE)
- All queries automatically filtered by `user_id`

## Indexes

The migration creates optimized indexes for:
- Project and task queries
- Event timeline queries
- Time-based sorting
- Status and priority filtering
- Task locking checks

## Breaking Changes

This migration expands the `tasks.status` enum to include:
- `blocked` - Task cannot proceed (waiting for blocker resolution)
- `cancelled` - Task was cancelled

Existing tasks with status 'todo', 'in_progress', or 'done' are unaffected.

## Rollback

To rollback this migration:

```sql
-- Drop new tables
DROP TABLE IF EXISTS decisions CASCADE;
DROP TABLE IF EXISTS checkpoints CASCADE;
DROP TABLE IF EXISTS artifacts CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Remove added columns from tasks
ALTER TABLE tasks 
  DROP COLUMN IF EXISTS acceptance_criteria,
  DROP COLUMN IF EXISTS constraints,
  DROP COLUMN IF EXISTS dependencies,
  DROP COLUMN IF EXISTS locked_at,
  DROP COLUMN IF EXISTS locked_by;

-- Restore original status constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('todo', 'in_progress', 'done'));

-- Remove added columns from projects
ALTER TABLE projects DROP COLUMN IF EXISTS rules;

-- Drop views
DROP VIEW IF EXISTS task_progress;
DROP VIEW IF EXISTS recent_events;
DROP VIEW IF EXISTS active_tasks;
```

**Note**: Rollback will result in data loss for events, artifacts, checkpoints, and decisions.

