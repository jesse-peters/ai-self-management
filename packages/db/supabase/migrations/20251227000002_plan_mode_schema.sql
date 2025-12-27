-- Migration: Add Plan Mode Schema Support
-- Description: Adds columns to support plan mode (task_key, definition_of_done, expected_files, touched_files)
-- This enables local plan files with stable task keys and file tracking

-- ============================================================================
-- 1. Agent Tasks Table - Add Plan Mode Columns
-- ============================================================================

-- Add task_key for stable reference in plan files
ALTER TABLE agent_tasks
ADD COLUMN IF NOT EXISTS task_key TEXT UNIQUE;

COMMENT ON COLUMN agent_tasks.task_key IS 'Stable unique key for referencing this task in plan files (e.g., "task-001", "task-fix-auth")';

-- Add expected_files for specification of what files should be touched
ALTER TABLE agent_tasks
ADD COLUMN IF NOT EXISTS expected_files TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN agent_tasks.expected_files IS 'Array of file paths this task is expected to modify or create';

-- Add touched_files for tracking what files were actually modified
ALTER TABLE agent_tasks
ADD COLUMN IF NOT EXISTS touched_files TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN agent_tasks.touched_files IS 'Array of file paths actually modified by this task (updated on completion)';

-- Add subtasks for complex tasks that need decomposition
ALTER TABLE agent_tasks
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN agent_tasks.subtasks IS 'Array of subtask objects for complex tasks: [{key, title, status, dependencies}]';

-- Add gates JSONB for task-level gate requirements
ALTER TABLE agent_tasks
ADD COLUMN IF NOT EXISTS gates JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN agent_tasks.gates IS 'Array of gate names that must pass for this task to be considered done';

-- ============================================================================
-- 2. Work Items Table - Add Definition of Done
-- ============================================================================

-- Add definition_of_done for work items
ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS definition_of_done TEXT;

COMMENT ON COLUMN work_items.definition_of_done IS 'Acceptance criteria that defines when this work item is complete';

-- ============================================================================
-- 3. Add Indexes for Plan Mode Queries
-- ============================================================================

-- Index for task_key lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_tasks_task_key ON agent_tasks(task_key) WHERE task_key IS NOT NULL;

-- GIN indexes for array queries on files
CREATE INDEX IF NOT EXISTS idx_agent_tasks_expected_files ON agent_tasks USING gin(expected_files);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_touched_files ON agent_tasks USING gin(touched_files);

-- GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_agent_tasks_subtasks ON agent_tasks USING gin(subtasks);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_gates ON agent_tasks USING gin(gates);

-- ============================================================================
-- 4. Service Role Policies (Allow MCP server to manage new columns)
-- ============================================================================

-- Policies are already in place from previous migration for service_role on agent_tasks and work_items


