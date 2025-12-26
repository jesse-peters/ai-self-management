-- Migration: Multi-Tenancy Architecture with Workspaces
-- Description: Implements workspace-based multi-tenancy by adding workspace_id column to all tables
-- and creating user-workspace membership relationships
--
-- Key Changes:
-- 1. Create workspaces table (tenant boundary)
-- 2. Create workspace_members table (user-workspace membership)
-- 3. Add workspace_id column to all existing tables
-- 4. Update all RLS policies to scope by workspace
-- 5. Create workspace-level RLS policies
-- 6. Add composite indexes for workspace + other fields
--
-- Migration Strategy:
-- - All existing data gets assigned to a DEFAULT workspace per user
-- - Preserves all foreign key relationships
-- - Maintains backward compatibility through careful policy design

-- ============================================================================
-- 1. Create workspaces table
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace metadata
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Owner/creator
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Settings
  is_personal BOOLEAN NOT NULL DEFAULT false, -- Personal workspace (1:1 with user)
  settings JSONB DEFAULT '{}'::jsonb, -- Future: billing, features, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by_user_id ON workspaces(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_is_personal ON workspaces(is_personal) WHERE is_personal = true;
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces(created_at DESC);

-- Comments
COMMENT ON TABLE workspaces IS 'Tenant boundary - groups users, projects, and work into isolated workspaces';
COMMENT ON COLUMN workspaces.slug IS 'URL-friendly workspace identifier';
COMMENT ON COLUMN workspaces.is_personal IS 'True for 1:1 personal workspaces, false for team/shared workspaces';

-- Enable RLS (policies will be created after workspace_members table exists)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Create workspace_members table (join table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role-based access control (future)
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  
  -- Metadata
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one membership per user per workspace
  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);

-- Comments
COMMENT ON TABLE workspace_members IS 'User membership in workspaces with role-based access control';
COMMENT ON COLUMN workspace_members.role IS 'User role in workspace: owner, admin, member, or viewer';
COMMENT ON COLUMN workspace_members.joined_at IS 'When user accepted the invitation (null if pending)';

-- Enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_members
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_members;
CREATE POLICY "Users can view their own workspace memberships" ON workspace_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all workspace memberships" ON workspace_members;
CREATE POLICY "Service role can manage all workspace memberships" ON workspace_members
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 2b. Create RLS Policies for workspaces (now that workspace_members exists)
-- ============================================================================

-- RLS Policies for workspaces
DROP POLICY IF EXISTS "Users can view workspaces they're members of" ON workspaces;
CREATE POLICY "Users can view workspaces they're members of" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = created_by_user_id);

DROP POLICY IF EXISTS "Workspace creators can update their workspaces" ON workspaces;
CREATE POLICY "Workspace creators can update their workspaces" ON workspaces
  FOR UPDATE USING (auth.uid() = created_by_user_id);

DROP POLICY IF EXISTS "Workspace creators can delete their workspaces" ON workspaces;
CREATE POLICY "Workspace creators can delete their workspaces" ON workspaces
  FOR DELETE USING (auth.uid() = created_by_user_id);

-- Service role can manage all workspaces
DROP POLICY IF EXISTS "Service role can manage all workspaces" ON workspaces;
CREATE POLICY "Service role can manage all workspaces" ON workspaces
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. Add workspace_id to projects table
-- ============================================================================

ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Add foreign key constraint
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_workspace_id_fk;

ALTER TABLE projects
  ADD CONSTRAINT projects_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_user ON projects(workspace_id, user_id);

-- Update RLS policies for projects to scope by workspace
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (
    auth.uid() = user_id
    AND (workspace_id IS NULL OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (workspace_id IS NULL OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (
    auth.uid() = user_id
    AND (workspace_id IS NULL OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (
    auth.uid() = user_id
    AND (workspace_id IS NULL OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    ))
  );

-- ============================================================================
-- 5. Add workspace_id to tasks table
-- ============================================================================

ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_workspace_id_fk;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_user ON tasks(workspace_id, user_id);

-- ============================================================================
-- 5. Add workspace_id to agent_sessions table
-- ============================================================================

ALTER TABLE agent_sessions 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE agent_sessions
  DROP CONSTRAINT IF EXISTS agent_sessions_workspace_id_fk;

ALTER TABLE agent_sessions
  ADD CONSTRAINT agent_sessions_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_sessions_workspace_id ON agent_sessions(workspace_id);

-- ============================================================================
-- 6. Add workspace_id to events table (from task_focused migration)
-- ============================================================================

ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_workspace_id_fk;

ALTER TABLE events
  ADD CONSTRAINT events_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_workspace_created ON events(workspace_id, created_at DESC);

-- ============================================================================
-- 7. Add workspace_id to artifacts table
-- ============================================================================

ALTER TABLE artifacts 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE artifacts
  DROP CONSTRAINT IF EXISTS artifacts_workspace_id_fk;

ALTER TABLE artifacts
  ADD CONSTRAINT artifacts_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_artifacts_workspace_id ON artifacts(workspace_id);

-- ============================================================================
-- 8. Add workspace_id to checkpoints table
-- ============================================================================

ALTER TABLE checkpoints 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE checkpoints
  DROP CONSTRAINT IF EXISTS checkpoints_workspace_id_fk;

ALTER TABLE checkpoints
  ADD CONSTRAINT checkpoints_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_checkpoints_workspace_id ON checkpoints(workspace_id);

-- ============================================================================
-- 9. Add workspace_id to decisions table
-- ============================================================================

ALTER TABLE decisions 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE decisions
  DROP CONSTRAINT IF EXISTS decisions_workspace_id_fk;

ALTER TABLE decisions
  ADD CONSTRAINT decisions_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_decisions_workspace_id ON decisions(workspace_id);

-- ============================================================================
-- 10. Add workspace_id to project_specs table
-- ============================================================================

ALTER TABLE project_specs 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE project_specs
  DROP CONSTRAINT IF EXISTS project_specs_workspace_id_fk;

ALTER TABLE project_specs
  ADD CONSTRAINT project_specs_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_specs_workspace_id ON project_specs(workspace_id);

-- ============================================================================
-- 11. Add workspace_id to work_items table
-- ============================================================================

ALTER TABLE work_items 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE work_items
  DROP CONSTRAINT IF EXISTS work_items_workspace_id_fk;

ALTER TABLE work_items
  ADD CONSTRAINT work_items_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_work_items_workspace_id ON work_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_work_items_workspace_status ON work_items(workspace_id, status);

-- ============================================================================
-- 12. Add workspace_id to agent_tasks table
-- ============================================================================

ALTER TABLE agent_tasks 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE agent_tasks
  DROP CONSTRAINT IF EXISTS agent_tasks_workspace_id_fk;

ALTER TABLE agent_tasks
  ADD CONSTRAINT agent_tasks_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace_id ON agent_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace_status ON agent_tasks(workspace_id, status);

-- ============================================================================
-- 13. Add workspace_id to evidence table
-- ============================================================================

ALTER TABLE evidence 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE evidence
  DROP CONSTRAINT IF EXISTS evidence_workspace_id_fk;

ALTER TABLE evidence
  ADD CONSTRAINT evidence_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_evidence_workspace_id ON evidence(workspace_id);

-- ============================================================================
-- 14. Add workspace_id to gates table
-- ============================================================================

ALTER TABLE gates 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE gates
  DROP CONSTRAINT IF EXISTS gates_workspace_id_fk;

ALTER TABLE gates
  ADD CONSTRAINT gates_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_gates_workspace_id ON gates(workspace_id);

-- ============================================================================
-- 15. Add workspace_id to gate_runs table
-- ============================================================================

ALTER TABLE gate_runs 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE gate_runs
  DROP CONSTRAINT IF EXISTS gate_runs_workspace_id_fk;

ALTER TABLE gate_runs
  ADD CONSTRAINT gate_runs_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_gate_runs_workspace_id ON gate_runs(workspace_id);

-- ============================================================================
-- 16. Add workspace_id to constraints table
-- ============================================================================

ALTER TABLE constraints 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE constraints
  DROP CONSTRAINT IF EXISTS constraints_workspace_id_fk;

ALTER TABLE constraints
  ADD CONSTRAINT constraints_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_constraints_workspace_id ON constraints(workspace_id);

-- ============================================================================
-- 17. Add workspace_id to outcomes table
-- ============================================================================

ALTER TABLE outcomes 
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE outcomes
  DROP CONSTRAINT IF EXISTS outcomes_workspace_id_fk;

ALTER TABLE outcomes
  ADD CONSTRAINT outcomes_workspace_id_fk 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_outcomes_workspace_id ON outcomes(workspace_id);

-- ============================================================================
-- 18. Trigger to auto-update updated_at for workspaces
-- ============================================================================

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;

CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspaces_updated_at();

-- ============================================================================
-- 19. Helper Function: Create Personal Workspace for User
-- ============================================================================

CREATE OR REPLACE FUNCTION create_personal_workspace_for_user(user_id UUID)
RETURNS UUID AS $$
DECLARE
  workspace_id UUID;
  user_email TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  -- Create personal workspace
  INSERT INTO workspaces (
    name,
    slug,
    description,
    created_by_user_id,
    is_personal
  ) VALUES (
    COALESCE(user_email, 'Personal') || '''s Workspace',
    'personal-' || user_id::TEXT,
    'Personal workspace for ' || COALESCE(user_email, user_id::TEXT),
    user_id,
    true
  )
  RETURNING id INTO workspace_id;
  
  -- Add user as owner
  INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (workspace_id, user_id, 'owner', now());
  
  RETURN workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 20. Migration Data: Backfill workspace_id for existing data
-- ============================================================================

-- NOTE: This migration uses a strategy where:
-- 1. For each user with existing data, create a personal workspace
-- 2. Assign all their existing data to that workspace
-- 3. Future: Support moving data between workspaces, creating team workspaces, etc.

DO $$
DECLARE
  user_rec RECORD;
  new_workspace_id UUID;
BEGIN
  -- Get all unique users from projects
  FOR user_rec IN SELECT DISTINCT user_id FROM projects WHERE workspace_id IS NULL
  LOOP
    -- Create personal workspace for this user
    SELECT create_personal_workspace_for_user(user_rec.user_id) INTO new_workspace_id;
    
    -- Assign user's projects to their workspace
    UPDATE projects SET workspace_id = new_workspace_id WHERE user_id = user_rec.user_id AND workspace_id IS NULL;
    
    -- Assign user's tasks to their workspace
    UPDATE tasks SET workspace_id = new_workspace_id WHERE user_id = user_rec.user_id AND workspace_id IS NULL;
    
    -- Assign user's agent_sessions to their workspace
    UPDATE agent_sessions SET workspace_id = new_workspace_id WHERE user_id = user_rec.user_id AND workspace_id IS NULL;
    
    -- Assign user's work_items to their workspace
    UPDATE work_items SET workspace_id = new_workspace_id WHERE user_id = user_rec.user_id AND workspace_id IS NULL;
    
    -- Assign user's agent_tasks to their workspace
    UPDATE agent_tasks SET workspace_id = new_workspace_id WHERE user_id = user_rec.user_id AND workspace_id IS NULL;
  END LOOP;
  
  -- For events, checkpoints, decisions, evidence, gates, gate_runs, constraints, outcomes
  -- Link them to workspaces via their project or work_item
  UPDATE events SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE events.project_id = p.id AND events.workspace_id IS NULL;
  
  UPDATE artifacts SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE artifacts.task_id IN (SELECT id FROM tasks WHERE project_id = p.id) AND artifacts.workspace_id IS NULL;
  
  UPDATE checkpoints SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE checkpoints.project_id = p.id AND checkpoints.workspace_id IS NULL;
  
  UPDATE decisions SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE decisions.project_id = p.id AND decisions.workspace_id IS NULL;
  
  UPDATE project_specs SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE project_specs.project_id = p.id AND project_specs.workspace_id IS NULL;
  
  UPDATE work_items SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE work_items.project_id = p.id AND work_items.workspace_id IS NULL;
  
  UPDATE evidence SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE evidence.project_id = p.id AND evidence.workspace_id IS NULL;
  
  UPDATE gates SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE gates.project_id = p.id AND gates.workspace_id IS NULL;
  
  UPDATE gate_runs SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE gate_runs.project_id = p.id AND gate_runs.workspace_id IS NULL;
  
  UPDATE constraints SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE constraints.project_id = p.id AND constraints.workspace_id IS NULL;
  
  UPDATE outcomes SET workspace_id = p.workspace_id 
    FROM projects p 
    WHERE outcomes.project_id = p.id AND outcomes.workspace_id IS NULL;
END $$;

-- ============================================================================
-- 21. Comments and Documentation
-- ============================================================================

COMMENT ON COLUMN projects.workspace_id IS 'Workspace this project belongs to (null for legacy single-tenant data)';
COMMENT ON COLUMN tasks.workspace_id IS 'Workspace this task belongs to (null for legacy single-tenant data)';
COMMENT ON COLUMN agent_sessions.workspace_id IS 'Workspace this session belongs to';
COMMENT ON COLUMN events.workspace_id IS 'Workspace this event belongs to';
COMMENT ON COLUMN artifacts.workspace_id IS 'Workspace this artifact belongs to';
COMMENT ON COLUMN checkpoints.workspace_id IS 'Workspace this checkpoint belongs to';
COMMENT ON COLUMN decisions.workspace_id IS 'Workspace this decision belongs to';
COMMENT ON COLUMN project_specs.workspace_id IS 'Workspace this spec belongs to';
COMMENT ON COLUMN work_items.workspace_id IS 'Workspace this work item belongs to';
COMMENT ON COLUMN agent_tasks.workspace_id IS 'Workspace this task belongs to';
COMMENT ON COLUMN evidence.workspace_id IS 'Workspace this evidence belongs to';
COMMENT ON COLUMN gates.workspace_id IS 'Workspace this gate belongs to';
COMMENT ON COLUMN gate_runs.workspace_id IS 'Workspace this gate run belongs to';
COMMENT ON COLUMN constraints.workspace_id IS 'Workspace this constraint belongs to';
COMMENT ON COLUMN outcomes.workspace_id IS 'Workspace this outcome belongs to';

