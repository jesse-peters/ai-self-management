-- Migration: Add project conventions field
-- Description: Adds conventions_markdown column to projects table to store init interview results
-- This field stores project-level conventions that are synced to .pm/primer.md

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS conventions_markdown TEXT;

COMMENT ON COLUMN projects.conventions_markdown IS 'Project conventions from init interview - shared with recon and primer';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_projects_conventions ON projects(id) WHERE conventions_markdown IS NOT NULL;

