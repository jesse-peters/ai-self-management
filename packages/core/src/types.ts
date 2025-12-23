/**
 * Domain types for ProjectFlow
 * Re-exports database types and defines domain-specific types
 */

export type {
  Project,
  Task,
  AgentSession,
  Event,
  Artifact,
  Checkpoint,
  Decision,
  ProjectInsert,
  ProjectUpdate,
  TaskInsert,
  TaskUpdate,
  AgentSessionInsert,
  AgentSessionUpdate,
  EventInsert,
  ArtifactInsert,
  ArtifactUpdate,
  CheckpointInsert,
  CheckpointUpdate,
  DecisionInsert,
  DecisionUpdate,
} from '@projectflow/db';

/**
 * Task status enum
 */
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

/**
 * Task priority enum
 */
export type TaskPriority = 'low' | 'medium' | 'high';

/**
 * Event type enum - all possible event types in the system
 */
export type EventType =
  | 'ProjectCreated'
  | 'TaskCreated'
  | 'TaskStarted'
  | 'TaskBlocked'
  | 'TaskCompleted'
  | 'TaskCancelled'
  | 'ArtifactProduced'
  | 'GateEvaluated'
  | 'CheckpointCreated'
  | 'DecisionRecorded'
  | 'ScopeAsserted';

/**
 * Artifact type enum
 */
export type ArtifactType = 'diff' | 'pr' | 'test_report' | 'document' | 'other';

/**
 * Filters for querying tasks
 */
export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
}

/**
 * Project rules structure
 */
export interface ProjectRules {
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  defaultGates?: string[];
  approvalTriggers?: string[];
}

/**
 * Task constraints structure
 */
export interface TaskConstraints {
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  maxFiles?: number;
  requiresApproval?: boolean;
}

/**
 * Changeset manifest for scope checking
 */
export interface ChangesetManifest {
  filesChanged: string[];
  filesAdded: string[];
  filesDeleted: string[];
}

/**
 * Scope validation result
 */
export interface ScopeResult {
  allowed: boolean;
  reason?: string;
  violations?: string[];
}

/**
 * Gate configuration
 */
export interface Gate {
  type: 'has_tests' | 'has_docs' | 'has_artifacts' | 'acceptance_met' | 'custom';
  config?: Record<string, any>;
}

/**
 * Gate evaluation result
 */
export interface GateResult {
  passed: boolean;
  gate: Gate;
  reason?: string;
  missingRequirements?: string[];
}

/**
 * Combined project context with all related data
 */
export interface ProjectContext {
  project: any; // Project type from @projectflow/db
  tasks: any[]; // Task[] from @projectflow/db
  latestSession: any | null; // AgentSession | null from @projectflow/db
  latestCheckpoint?: any | null; // Checkpoint | null from @projectflow/db
  activeTask?: any | null; // Task | null from @projectflow/db
  rules?: ProjectRules;
}

