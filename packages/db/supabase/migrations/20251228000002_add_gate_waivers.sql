-- Migration: Add gate_waivers table
-- Description: Tracks gate waivers with linked decisions and constraint evaluations

CREATE TABLE IF NOT EXISTS gate_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  rationale TEXT NOT NULL,
  constraint_evaluation JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL CHECK (created_by IN ('agent', 'human')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_gate_waivers_project_id ON gate_waivers(project_id);
CREATE INDEX IF NOT EXISTS idx_gate_waivers_gate_id ON gate_waivers(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_waivers_work_item_id ON gate_waivers(work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gate_waivers_task_id ON gate_waivers(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gate_waivers_decision_id ON gate_waivers(decision_id);
CREATE INDEX IF NOT EXISTS idx_gate_waivers_user_id ON gate_waivers(user_id);
CREATE INDEX IF NOT EXISTS idx_gate_waivers_created_at ON gate_waivers(created_at DESC);

-- RLS policies
ALTER TABLE gate_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gate waivers for their projects"
  ON gate_waivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gate_waivers.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert gate waivers for their projects"
  ON gate_waivers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gate_waivers.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update gate waivers for their projects"
  ON gate_waivers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gate_waivers.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete gate waivers for their projects"
  ON gate_waivers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gate_waivers.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE gate_waivers IS 'Tracks gate waivers with linked decisions and constraint evaluations';
COMMENT ON COLUMN gate_waivers.decision_id IS 'Required: decision that justifies this waiver';
COMMENT ON COLUMN gate_waivers.constraint_evaluation IS 'Results from evaluateConstraints() when waiver was created';
COMMENT ON COLUMN gate_waivers.created_by IS 'Whether waiver was created by agent or human';

