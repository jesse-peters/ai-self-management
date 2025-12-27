-- Migration: Add memory recall IDs to decisions table
-- Description: Tracks which decisions/outcomes were consulted when making a decision

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS memory_recall_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Index for memory recall lookups
CREATE INDEX IF NOT EXISTS idx_decisions_memory_recall_ids ON decisions USING gin(memory_recall_ids);

-- Comment
COMMENT ON COLUMN decisions.memory_recall_ids IS 'Array of decision/outcome IDs that were consulted when making this decision';

