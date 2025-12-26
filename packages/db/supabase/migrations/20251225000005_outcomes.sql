-- Migration: Add outcomes table for tracking decision/task results
-- Description: Records what actually happened after decisions/tasks, creating the foundation for learning

CREATE TABLE IF NOT EXISTS outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- What this outcome is about
  subject_type text NOT NULL CHECK (subject_type IN ('decision', 'task', 'gate', 'checkpoint')),
  subject_id uuid NOT NULL,
  
  -- How it turned out
  result text NOT NULL CHECK (result IN ('worked', 'didnt_work', 'mixed', 'unknown')),
  
  -- Supporting information
  evidence_ids uuid[] DEFAULT ARRAY[]::uuid[], -- References to artifacts or other evidence
  notes text,
  root_cause text, -- Why did it work/not work?
  recommendation text, -- What should we do differently next time?
  tags text[] DEFAULT ARRAY[]::text[],
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL CHECK (created_by IN ('agent', 'human')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_outcomes_project_id ON outcomes(project_id);
CREATE INDEX idx_outcomes_subject ON outcomes(subject_type, subject_id);
CREATE INDEX idx_outcomes_result ON outcomes(result);
CREATE INDEX idx_outcomes_tags ON outcomes USING gin(tags);
CREATE INDEX idx_outcomes_created_at ON outcomes(created_at DESC);

-- RLS policies
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outcomes for their projects"
  ON outcomes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = outcomes.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outcomes for their projects"
  ON outcomes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = outcomes.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own outcomes"
  ON outcomes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own outcomes"
  ON outcomes FOR DELETE
  USING (user_id = auth.uid());

-- Comment on table
COMMENT ON TABLE outcomes IS 'Records the actual results of decisions, tasks, gates, and checkpoints for learning and improvement';

