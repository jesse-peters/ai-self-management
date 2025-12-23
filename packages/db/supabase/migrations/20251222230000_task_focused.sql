-- Task-Focused MCP Server Migration
-- Adds event sourcing, artifacts, checkpoints, decisions, and enhances tasks/projects

-- ============================================================================
-- 1. Enhance Projects Table
-- ============================================================================

-- Add rules column for scope rules, default gates, approval triggers
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN projects.rules IS 'Project rules including scope limits, default gates, and approval triggers';

-- ============================================================================
-- 2. Enhance Tasks Table
-- ============================================================================

-- Add acceptance criteria as array of text
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add constraints for scope limits, allowed file paths, etc.
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '{}'::jsonb;

-- Add dependencies as array of task IDs
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS dependencies UUID[] DEFAULT ARRAY[]::UUID[];

-- Add task locking mechanism
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Expand status enum to include 'blocked' and 'cancelled'
-- First, drop the existing constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new constraint with expanded values
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled'));

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_locked_at ON tasks(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Add comments for documentation
COMMENT ON COLUMN tasks.acceptance_criteria IS 'List of requirements that must be met for task completion';
COMMENT ON COLUMN tasks.constraints IS 'Scope limits, allowed file paths, and other constraints';
COMMENT ON COLUMN tasks.dependencies IS 'Array of task IDs that must complete before this task can start';
COMMENT ON COLUMN tasks.locked_at IS 'Timestamp when task was picked/started by an agent';
COMMENT ON COLUMN tasks.locked_by IS 'Session/agent identifier that locked this task';

-- ============================================================================
-- 3. Create Events Table (Append-Only Event Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Composite index for project timeline queries
CREATE INDEX IF NOT EXISTS idx_events_project_created ON events(project_id, created_at DESC);

-- Composite index for task event queries
CREATE INDEX IF NOT EXISTS idx_events_task_created ON events(task_id, created_at DESC) WHERE task_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE events IS 'Append-only event log - source of truth for all state changes';
COMMENT ON COLUMN events.event_type IS 'Event type: ProjectCreated, TaskStarted, ArtifactProduced, GateEvaluated, CheckpointCreated, etc.';
COMMENT ON COLUMN events.payload IS 'Event-specific data as JSON';

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;

CREATE POLICY "Users can view their own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: Events are append-only, no UPDATE or DELETE policies

-- ============================================================================
-- 4. Create Artifacts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('diff', 'pr', 'test_report', 'document', 'other')),
  ref TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_artifacts_task_id ON artifacts(task_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at DESC);

-- Composite index for task artifacts queries
CREATE INDEX IF NOT EXISTS idx_artifacts_task_created ON artifacts(task_id, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE artifacts IS 'References to outputs produced during task work';
COMMENT ON COLUMN artifacts.type IS 'Artifact type: diff, pr, test_report, document, or other';
COMMENT ON COLUMN artifacts.ref IS 'URL, file path, or identifier for the artifact';
COMMENT ON COLUMN artifacts.summary IS 'Brief description of the artifact';

-- Enable RLS
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for artifacts table
DROP POLICY IF EXISTS "Users can view their own artifacts" ON artifacts;
DROP POLICY IF EXISTS "Users can insert their own artifacts" ON artifacts;
DROP POLICY IF EXISTS "Users can update their own artifacts" ON artifacts;
DROP POLICY IF EXISTS "Users can delete their own artifacts" ON artifacts;

CREATE POLICY "Users can view their own artifacts" ON artifacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own artifacts" ON artifacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artifacts" ON artifacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artifacts" ON artifacts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Create Checkpoints Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  repo_ref TEXT,
  summary TEXT NOT NULL,
  resume_instructions TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_checkpoints_project_id ON checkpoints(project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_user_id ON checkpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON checkpoints(created_at DESC);

-- Composite index for project checkpoints queries
CREATE INDEX IF NOT EXISTS idx_checkpoints_project_created ON checkpoints(project_id, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE checkpoints IS 'Resumable snapshots of project state';
COMMENT ON COLUMN checkpoints.label IS 'Human-readable name for the checkpoint';
COMMENT ON COLUMN checkpoints.repo_ref IS 'Git commit, branch, or tag reference';
COMMENT ON COLUMN checkpoints.summary IS 'What was accomplished up to this point';
COMMENT ON COLUMN checkpoints.resume_instructions IS 'How to continue from this checkpoint';
COMMENT ON COLUMN checkpoints.snapshot IS 'Full state context as JSON';

-- Enable RLS
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkpoints table
DROP POLICY IF EXISTS "Users can view their own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can insert their own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can update their own checkpoints" ON checkpoints;
DROP POLICY IF EXISTS "Users can delete their own checkpoints" ON checkpoints;

CREATE POLICY "Users can view their own checkpoints" ON checkpoints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkpoints" ON checkpoints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkpoints" ON checkpoints
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checkpoints" ON checkpoints
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Create Decisions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  choice TEXT NOT NULL,
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);

-- Composite index for project decisions queries
CREATE INDEX IF NOT EXISTS idx_decisions_project_created ON decisions(project_id, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE decisions IS 'Record of key decisions made during development';
COMMENT ON COLUMN decisions.title IS 'Short title describing the decision';
COMMENT ON COLUMN decisions.options IS 'Array of options that were considered';
COMMENT ON COLUMN decisions.choice IS 'The option that was selected';
COMMENT ON COLUMN decisions.rationale IS 'Explanation of why this choice was made';

-- Enable RLS
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decisions table
DROP POLICY IF EXISTS "Users can view their own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can insert their own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can update their own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can delete their own decisions" ON decisions;

CREATE POLICY "Users can view their own decisions" ON decisions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decisions" ON decisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decisions" ON decisions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decisions" ON decisions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7. Create Helper Functions
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at on projects and tasks
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Create Views for Common Queries
-- ============================================================================

-- View for active tasks with lock information
CREATE OR REPLACE VIEW active_tasks AS
SELECT 
  t.*,
  p.name as project_name,
  (t.locked_at IS NOT NULL AND t.locked_at > now() - INTERVAL '1 hour') as is_actively_locked
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.status IN ('in_progress', 'blocked')
ORDER BY t.locked_at DESC NULLS LAST;

-- View for recent events with context
CREATE OR REPLACE VIEW recent_events AS
SELECT 
  e.*,
  p.name as project_name,
  t.title as task_title
FROM events e
JOIN projects p ON e.project_id = p.id
LEFT JOIN tasks t ON e.task_id = t.id
ORDER BY e.created_at DESC;

-- View for task progress summary
CREATE OR REPLACE VIEW task_progress AS
SELECT 
  t.id,
  t.project_id,
  t.title,
  t.status,
  t.priority,
  array_length(t.acceptance_criteria, 1) as total_criteria,
  COUNT(DISTINCT a.id) as artifact_count,
  t.locked_at,
  t.locked_by,
  t.created_at,
  t.updated_at
FROM tasks t
LEFT JOIN artifacts a ON t.id = a.task_id
GROUP BY t.id;

COMMENT ON VIEW active_tasks IS 'Tasks currently in progress or blocked with lock status';
COMMENT ON VIEW recent_events IS 'Recent events with project and task context';
COMMENT ON VIEW task_progress IS 'Task summary with artifact counts and criteria info';

