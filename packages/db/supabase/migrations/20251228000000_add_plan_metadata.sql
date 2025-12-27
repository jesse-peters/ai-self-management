-- Migration: Add plan metadata columns to project_specs
-- Description: Adds plan file tracking (path, hash, timestamps) for Cursor Plan Mode integration

ALTER TABLE project_specs
  ADD COLUMN IF NOT EXISTS plan_path TEXT DEFAULT './.pm/plan.md',
  ADD COLUMN IF NOT EXISTS plan_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMPTZ;

-- Index for plan_path lookups
CREATE INDEX IF NOT EXISTS idx_project_specs_plan_path ON project_specs(plan_path) WHERE plan_path IS NOT NULL;

-- Index for plan_hash lookups
CREATE INDEX IF NOT EXISTS idx_project_specs_plan_hash ON project_specs(plan_hash) WHERE plan_hash IS NOT NULL;

-- Comments
COMMENT ON COLUMN project_specs.plan_path IS 'Path to the plan file (default: ./.pm/plan.md)';
COMMENT ON COLUMN project_specs.plan_hash IS 'Hash of the plan file content for change detection';
COMMENT ON COLUMN project_specs.last_imported_at IS 'Timestamp when plan was last imported from file';
COMMENT ON COLUMN project_specs.last_exported_at IS 'Timestamp when plan was last exported to file';


