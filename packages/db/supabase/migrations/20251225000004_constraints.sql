-- Create constraints table for storing project constraints
-- Constraints turn lessons into enforceable rules that warn or block risky actions

CREATE TABLE IF NOT EXISTS constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Constraint scope
  scope TEXT NOT NULL CHECK (scope IN ('project', 'repo', 'directory', 'task_type')),
  scope_value TEXT, -- Optional: specific directory path or task type
  
  -- Trigger conditions
  trigger TEXT NOT NULL CHECK (trigger IN ('files_match', 'task_tag', 'gate', 'keyword', 'always')),
  trigger_value TEXT, -- Optional: specific pattern, tag, gate, or keyword
  
  -- Rule definition
  rule_text TEXT NOT NULL,
  enforcement_level TEXT NOT NULL CHECK (enforcement_level IN ('warn', 'block')),
  
  -- Source links to decisions/outcomes that justify this constraint
  source_links JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_constraints_project_id ON constraints(project_id);
CREATE INDEX IF NOT EXISTS idx_constraints_user_id ON constraints(user_id);
CREATE INDEX IF NOT EXISTS idx_constraints_scope ON constraints(scope);
CREATE INDEX IF NOT EXISTS idx_constraints_trigger ON constraints(trigger);
CREATE INDEX IF NOT EXISTS idx_constraints_enforcement ON constraints(enforcement_level);

-- Enable RLS
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;

-- Service role can manage all constraints
CREATE POLICY "Service role can manage all constraints"
  ON constraints FOR ALL
  USING (auth.role() = 'service_role');

-- Users can manage their own constraints
CREATE POLICY "Users can manage their own constraints"
  ON constraints FOR ALL
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_constraint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_constraints_updated_at
  BEFORE UPDATE ON constraints
  FOR EACH ROW
  EXECUTE FUNCTION update_constraint_updated_at();


