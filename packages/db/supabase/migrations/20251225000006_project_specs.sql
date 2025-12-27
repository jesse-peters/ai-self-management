-- Migration: Add project_specs table for structured project kickoff
-- Description: Stores project specifications including goals, deliverables, risks, and gate configurations

CREATE TABLE IF NOT EXISTS project_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Project goals and definition of done
  goals text NOT NULL, -- What are we trying to achieve?
  definition_of_done text NOT NULL, -- How do we know when we're finished?
  deliverables jsonb DEFAULT '[]'::jsonb, -- Array of deliverable objects with name, description, etc.
  
  -- Repository and code context
  repo_context jsonb DEFAULT '{}'::jsonb, -- Repo URL, main branch, language, framework, etc.
  
  -- Risk management
  risk_areas text[] DEFAULT ARRAY[]::text[], -- Areas of the codebase that are risky or fragile
  preferences jsonb DEFAULT '{}'::jsonb, -- Coding preferences, style guidelines, etc.
  
  -- Gate configuration
  gate_pack_id text, -- Reference to a predefined gate pack (if applicable)
  custom_gates jsonb DEFAULT '[]'::jsonb, -- Custom gate definitions if not using a pack
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_project_specs_project_id ON project_specs(project_id);
CREATE INDEX idx_project_specs_user_id ON project_specs(user_id);

-- RLS policies
ALTER TABLE project_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project specs for their projects"
  ON project_specs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_specs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project specs for their projects"
  ON project_specs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_specs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project specs for their projects"
  ON project_specs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_specs.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_specs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project specs for their projects"
  ON project_specs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_specs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER project_specs_updated_at
  BEFORE UPDATE ON project_specs
  FOR EACH ROW
  EXECUTE FUNCTION update_project_specs_updated_at();

-- Comment on table
COMMENT ON TABLE project_specs IS 'Structured project specifications including goals, deliverables, risks, and gate configurations for guided project kickoff';


