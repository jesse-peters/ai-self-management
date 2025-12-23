# Database Migration Implementation Summary

## Migration Created: `20251222230000_task_focused.sql`

This comprehensive migration implements Phase 1 of the Task-Focused MCP Server implementation plan.

## What Was Implemented

### 1. Enhanced Existing Tables

#### Projects Table
- Added `rules` (JSONB) column for:
  - Scope rules (allowed/forbidden paths)
  - Default quality gates
  - Approval triggers

#### Tasks Table
- Added `acceptance_criteria` (TEXT[]) - list of requirements for task completion
- Added `constraints` (JSONB) - scope limits and file path restrictions
- Added `dependencies` (UUID[]) - task dependency tracking
- Added `locked_at` (TIMESTAMPTZ) - when task was locked by an agent
- Added `locked_by` (TEXT) - identifier of the agent/session that locked the task
- Expanded `status` enum to include 'blocked' and 'cancelled' states
- Added indexes for efficient queries on status, priority, and lock status

### 2. New Tables Created

#### Events Table
- **Purpose**: Append-only event log (source of truth)
- **Columns**:
  - `id` (UUID) - primary key
  - `project_id` (UUID) - reference to project
  - `task_id` (UUID, nullable) - reference to task if applicable
  - `user_id` (UUID) - user who triggered the event
  - `event_type` (TEXT) - type of event (TaskStarted, ArtifactProduced, etc.)
  - `payload` (JSONB) - event-specific data
  - `created_at` (TIMESTAMPTZ) - when event occurred
- **Indexes**: Optimized for project timelines, task events, and event type filtering
- **RLS**: Append-only with user-scoped read access

#### Artifacts Table
- **Purpose**: Track work outputs (diffs, PRs, test reports, documents)
- **Columns**:
  - `id` (UUID) - primary key
  - `task_id` (UUID) - reference to task
  - `user_id` (UUID) - user who created artifact
  - `type` (TEXT) - enum: diff, pr, test_report, document, other
  - `ref` (TEXT) - URL, file path, or identifier
  - `summary` (TEXT) - brief description
  - `created_at` (TIMESTAMPTZ)
- **Indexes**: Optimized for task artifact queries
- **RLS**: Full CRUD with user-scoped access

#### Checkpoints Table
- **Purpose**: Resumable project snapshots for session continuity
- **Columns**:
  - `id` (UUID) - primary key
  - `project_id` (UUID) - reference to project
  - `user_id` (UUID) - user who created checkpoint
  - `label` (TEXT) - human-readable name
  - `repo_ref` (TEXT) - git commit, branch, or tag
  - `summary` (TEXT) - what was accomplished
  - `resume_instructions` (TEXT) - how to continue
  - `snapshot` (JSONB) - full state context
  - `created_at` (TIMESTAMPTZ)
- **Indexes**: Optimized for project checkpoint queries
- **RLS**: Full CRUD with user-scoped access

#### Decisions Table
- **Purpose**: Record architectural and design decisions
- **Columns**:
  - `id` (UUID) - primary key
  - `project_id` (UUID) - reference to project
  - `user_id` (UUID) - user who made decision
  - `title` (TEXT) - short title
  - `options` (JSONB) - array of options considered
  - `choice` (TEXT) - selected option
  - `rationale` (TEXT) - explanation
  - `created_at` (TIMESTAMPTZ)
- **Indexes**: Optimized for project decision queries
- **RLS**: Full CRUD with user-scoped access

### 3. Database Views

Created three convenience views for common queries:

1. **active_tasks** - Shows tasks in progress or blocked with lock status
2. **recent_events** - Recent events with project and task context
3. **task_progress** - Task summary with artifact counts and criteria info

### 4. Helper Functions

- `update_updated_at_column()` - Trigger function to automatically update timestamps
- Applied triggers to projects and tasks tables

### 5. Security

- All new tables have Row Level Security (RLS) enabled
- User-scoped policies ensure data isolation
- Events are append-only (no UPDATE/DELETE policies)
- Indexes optimized for RLS-filtered queries

## TypeScript Type Updates

Updated type definitions to reflect the new schema:

### `packages/db/src/types.ts`
- Added `Event`, `Artifact`, `Checkpoint`, `Decision` row types
- Added `EventInsert`, `ArtifactInsert`, `ArtifactUpdate` types
- Added `CheckpointInsert`, `CheckpointUpdate` types
- Added `DecisionInsert`, `DecisionUpdate` types

### `packages/core/src/types.ts`
- Re-exported all new database types
- Updated `TaskStatus` to include 'blocked' and 'cancelled'
- Added `EventType` enum with all event types
- Added `ArtifactType` enum
- Added `ProjectRules` interface
- Added `TaskConstraints` interface
- Added `ChangesetManifest` interface for scope checking
- Added `ScopeResult` interface
- Added `Gate` and `GateResult` interfaces
- Enhanced `ProjectContext` interface

## Documentation

Created `packages/db/supabase/migrations/README.md` with:
- Migration overview
- Table descriptions
- Application instructions
- Rollback procedures
- Breaking changes documentation

## Next Steps

After this migration is applied:

1. Run `pnpm db:generate-types` to regenerate TypeScript types from the actual schema
2. Proceed to Phase 2: Event Sourcing Infrastructure
3. Proceed to Phase 3: Task Management Enhancements

## Files Modified/Created

1. ✅ `/packages/db/supabase/migrations/20251222230000_task_focused.sql` - Migration file
2. ✅ `/packages/db/supabase/migrations/README.md` - Migration documentation
3. ✅ `/packages/db/src/types.ts` - Updated type definitions
4. ✅ `/packages/core/src/types.ts` - Updated domain types

## Migration Safety

- Uses `IF NOT EXISTS` and `IF EXISTS` clauses for idempotency
- Existing data is preserved (columns added with defaults)
- Status constraint update is non-destructive (existing values still valid)
- All changes are additive except for the status constraint replacement
- Comprehensive rollback instructions provided

## Testing Checklist

Before deploying to production:
- [ ] Apply migration to local Supabase instance
- [ ] Verify all tables created successfully
- [ ] Verify indexes created
- [ ] Verify RLS policies work correctly
- [ ] Test type generation works
- [ ] Verify existing data still accessible
- [ ] Test insert/update/delete operations on new tables

