-- MVP Agent Execution Migration
-- Description: Add Work Items, Agent Tasks, Evidence, Gates, and Gate Runs tables
-- This extends the existing system with a clean agent execution workflow

-- ============================================================================
-- 1. Work Items Table (External Ticket References)
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Work item details
  title TEXT NOT NULL,
  description TEXT,
  external_url TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_work_items_project_id ON work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_user_id ON work_items(user_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_created_at ON work_items(created_at DESC);

-- Composite index for project work items queries
CREATE INDEX IF NOT EXISTS idx_work_items_project_status ON work_items(project_id, status);

-- Add comment for documentation
COMMENT ON TABLE work_items IS 'External ticket/issue references that group related agent tasks';
COMMENT ON COLUMN work_items.external_url IS 'URL to external issue tracker (GitHub, Jira, etc.)';
COMMENT ON COLUMN work_items.status IS 'Work item status: open, in_progress, or done';

-- Enable RLS
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_items table
DROP POLICY IF EXISTS "Users can view their own work items" ON work_items;
DROP POLICY IF EXISTS "Users can insert their own work items" ON work_items;
DROP POLICY IF EXISTS "Users can update their own work items" ON work_items;
DROP POLICY IF EXISTS "Users can delete their own work items" ON work_items;

CREATE POLICY "Users can view their own work items" ON work_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own work items" ON work_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work items" ON work_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work items" ON work_items
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Agent Tasks Table (Micro Work Packets)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task details
  type TEXT NOT NULL CHECK (type IN ('research', 'implement', 'verify', 'docs', 'cleanup')),
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  context TEXT,
  inputs TEXT,
  output_expectation TEXT,
  verification TEXT,
  
  -- Status and dependencies
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'doing', 'blocked', 'review', 'done')),
  depends_on_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Risk and timeboxing
  risk TEXT DEFAULT 'low' CHECK (risk IN ('low', 'medium', 'high')),
  timebox_minutes INTEGER DEFAULT 15,
  
  -- Blocking information
  blocked_reason TEXT,
  
  -- Task locking mechanism
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_agent_tasks_project_id ON agent_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_work_item_id ON agent_tasks(work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_id ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_locked_at ON agent_tasks(locked_at) WHERE locked_at IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_agent_tasks_project_status ON agent_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_work_item_status ON agent_tasks(work_item_id, status) WHERE work_item_id IS NOT NULL;

-- GIN index for dependencies array queries
CREATE INDEX IF NOT EXISTS idx_agent_tasks_depends_on ON agent_tasks USING gin(depends_on_ids);

-- Add comment for documentation
COMMENT ON TABLE agent_tasks IS 'Micro work packets for agent execution with clear goals and verification';
COMMENT ON COLUMN agent_tasks.type IS 'Task type: research, implement, verify, docs, or cleanup';
COMMENT ON COLUMN agent_tasks.goal IS 'One sentence goal for this task';
COMMENT ON COLUMN agent_tasks.context IS 'Background information needed for this task';
COMMENT ON COLUMN agent_tasks.verification IS 'How to verify this task is done correctly';
COMMENT ON COLUMN agent_tasks.status IS 'Task status: ready, doing, blocked, review, or done';
COMMENT ON COLUMN agent_tasks.depends_on_ids IS 'Array of task IDs that must be completed first';
COMMENT ON COLUMN agent_tasks.timebox_minutes IS 'Recommended time limit in minutes (default 15)';
COMMENT ON COLUMN agent_tasks.blocked_reason IS 'Reason why task is blocked (required when status=blocked)';

-- Enable RLS
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_tasks table
DROP POLICY IF EXISTS "Users can view their own agent tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Users can insert their own agent tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Users can update their own agent tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Users can delete their own agent tasks" ON agent_tasks;

CREATE POLICY "Users can view their own agent tasks" ON agent_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent tasks" ON agent_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent tasks" ON agent_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent tasks" ON agent_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Evidence Table (Proof Attached to Tasks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Evidence details
  type TEXT NOT NULL CHECK (type IN ('note', 'link', 'log', 'diff')),
  content TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK (created_by IN ('agent', 'human')),
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_evidence_project_id ON evidence(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_work_item_id ON evidence(work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_task_id ON evidence(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_user_id ON evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(type);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_evidence_task_created ON evidence(task_id, created_at DESC) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_work_item_created ON evidence(work_item_id, created_at DESC) WHERE work_item_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE evidence IS 'Proof and documentation attached to agent tasks or work items';
COMMENT ON COLUMN evidence.type IS 'Evidence type: note, link, log, or diff';
COMMENT ON COLUMN evidence.content IS 'Evidence content (text, URL, log output, diff)';
COMMENT ON COLUMN evidence.created_by IS 'Who created this evidence: agent or human';

-- Enable RLS
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evidence table
DROP POLICY IF EXISTS "Users can view their own evidence" ON evidence;
DROP POLICY IF EXISTS "Users can insert their own evidence" ON evidence;
DROP POLICY IF EXISTS "Users can update their own evidence" ON evidence;
DROP POLICY IF EXISTS "Users can delete their own evidence" ON evidence;

CREATE POLICY "Users can view their own evidence" ON evidence
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evidence" ON evidence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evidence" ON evidence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evidence" ON evidence
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Gates Table (Project-Level Verification Configs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Gate configuration
  name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  runner_mode TEXT NOT NULL CHECK (runner_mode IN ('manual', 'command')),
  command TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one gate per name per project
  CONSTRAINT gates_project_name_unique UNIQUE (project_id, name)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_gates_project_id ON gates(project_id);
CREATE INDEX IF NOT EXISTS idx_gates_user_id ON gates(user_id);
CREATE INDEX IF NOT EXISTS idx_gates_is_required ON gates(is_required) WHERE is_required = true;

-- Add comment for documentation
COMMENT ON TABLE gates IS 'Project-level verification configurations (tests, lint, etc.)';
COMMENT ON COLUMN gates.name IS 'Gate name (e.g., tests, lint, type-check)';
COMMENT ON COLUMN gates.is_required IS 'Whether this gate must pass before closing work items';
COMMENT ON COLUMN gates.runner_mode IS 'How to run: manual (human-triggered) or command (automated)';
COMMENT ON COLUMN gates.command IS 'Shell command to execute (when runner_mode=command)';

-- Enable RLS
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gates table
DROP POLICY IF EXISTS "Users can view their own gates" ON gates;
DROP POLICY IF EXISTS "Users can insert their own gates" ON gates;
DROP POLICY IF EXISTS "Users can update their own gates" ON gates;
DROP POLICY IF EXISTS "Users can delete their own gates" ON gates;

CREATE POLICY "Users can view their own gates" ON gates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gates" ON gates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gates" ON gates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gates" ON gates
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Gate Runs Table (Gate Execution Results)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gate_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Execution results
  status TEXT NOT NULL CHECK (status IN ('passing', 'failing')),
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_gate_runs_project_id ON gate_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_gate_runs_gate_id ON gate_runs(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_runs_work_item_id ON gate_runs(work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gate_runs_task_id ON gate_runs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gate_runs_user_id ON gate_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_gate_runs_status ON gate_runs(status);
CREATE INDEX IF NOT EXISTS idx_gate_runs_created_at ON gate_runs(created_at DESC);

-- Composite indexes for latest status queries
CREATE INDEX IF NOT EXISTS idx_gate_runs_gate_created ON gate_runs(gate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gate_runs_work_item_created ON gate_runs(work_item_id, created_at DESC) WHERE work_item_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE gate_runs IS 'Historical record of gate execution results';
COMMENT ON COLUMN gate_runs.status IS 'Gate run status: passing or failing';
COMMENT ON COLUMN gate_runs.stdout IS 'Standard output from gate execution';
COMMENT ON COLUMN gate_runs.stderr IS 'Standard error from gate execution';
COMMENT ON COLUMN gate_runs.exit_code IS 'Exit code from gate command (0 = success)';

-- Enable RLS
ALTER TABLE gate_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gate_runs table
DROP POLICY IF EXISTS "Users can view their own gate runs" ON gate_runs;
DROP POLICY IF EXISTS "Users can insert their own gate runs" ON gate_runs;
DROP POLICY IF EXISTS "Users can update their own gate runs" ON gate_runs;
DROP POLICY IF EXISTS "Users can delete their own gate runs" ON gate_runs;

CREATE POLICY "Users can view their own gate runs" ON gate_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gate runs" ON gate_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gate runs" ON gate_runs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gate runs" ON gate_runs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Update Existing Tables for Integration
-- ============================================================================

-- Extend outcomes table to support new subject types
ALTER TABLE outcomes 
  DROP CONSTRAINT IF EXISTS outcomes_subject_type_check;

ALTER TABLE outcomes 
  ADD CONSTRAINT outcomes_subject_type_check 
  CHECK (subject_type IN ('decision', 'task', 'gate', 'checkpoint', 'work_item', 'agent_task', 'gate_run'));

COMMENT ON COLUMN outcomes.subject_type IS 'What this outcome is about: decision, task, gate, checkpoint, work_item, agent_task, or gate_run';

-- ============================================================================
-- 7. Triggers for Updated_at Columns
-- ============================================================================

-- Add triggers to update updated_at on new tables
DROP TRIGGER IF EXISTS update_work_items_updated_at ON work_items;
CREATE TRIGGER update_work_items_updated_at
  BEFORE UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_tasks_updated_at ON agent_tasks;
CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gates_updated_at ON gates;
CREATE TRIGGER update_gates_updated_at
  BEFORE UPDATE ON gates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Helper Views for Common Queries
-- ============================================================================

-- View for work item progress summary
CREATE OR REPLACE VIEW work_item_progress AS
SELECT 
  wi.id,
  wi.project_id,
  wi.title,
  wi.description,
  wi.external_url,
  wi.status,
  COUNT(at.id) as total_tasks,
  COUNT(at.id) FILTER (WHERE at.status = 'done') as done_tasks,
  COUNT(at.id) FILTER (WHERE at.status = 'doing') as doing_tasks,
  COUNT(at.id) FILTER (WHERE at.status = 'blocked') as blocked_tasks,
  COUNT(DISTINCT e.id) as evidence_count,
  wi.created_at,
  wi.updated_at
FROM work_items wi
LEFT JOIN agent_tasks at ON wi.id = at.work_item_id
LEFT JOIN evidence e ON wi.id = e.work_item_id
GROUP BY wi.id;

COMMENT ON VIEW work_item_progress IS 'Work item summary with task counts and evidence';

-- View for agent task details with evidence count
CREATE OR REPLACE VIEW agent_task_details AS
SELECT 
  at.*,
  wi.title as work_item_title,
  wi.external_url as work_item_url,
  COUNT(DISTINCT e.id) as evidence_count,
  array_agg(DISTINCT e.type) FILTER (WHERE e.type IS NOT NULL) as evidence_types
FROM agent_tasks at
LEFT JOIN work_items wi ON at.work_item_id = wi.id
LEFT JOIN evidence e ON at.id = e.task_id
GROUP BY at.id, wi.title, wi.external_url;

COMMENT ON VIEW agent_task_details IS 'Agent task details with work item context and evidence counts';

-- View for latest gate status per project
CREATE OR REPLACE VIEW latest_gate_status AS
SELECT DISTINCT ON (g.project_id, g.id)
  g.project_id,
  g.id as gate_id,
  g.name as gate_name,
  g.is_required,
  gr.status as latest_status,
  gr.created_at as last_run_at
FROM gates g
LEFT JOIN gate_runs gr ON g.id = gr.gate_id
ORDER BY g.project_id, g.id, gr.created_at DESC NULLS LAST;

COMMENT ON VIEW latest_gate_status IS 'Latest execution status for each gate in each project';

-- ============================================================================
-- 9. Service Role Policies (for MCP server backend)
-- ============================================================================

-- Allow service role to manage all MVP tables
CREATE POLICY "Service role can manage all work items"
  ON work_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all agent tasks"
  ON agent_tasks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all evidence"
  ON evidence FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all gates"
  ON gates FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all gate runs"
  ON gate_runs FOR ALL
  USING (auth.role() = 'service_role');

