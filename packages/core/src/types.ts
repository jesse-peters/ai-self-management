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
  Constraint,
  Outcome,
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
  ConstraintInsert,
  ConstraintUpdate,
  OutcomeInsert,
  OutcomeUpdate,
  // MVP types
  WorkItem,
  WorkItemInsert,
  WorkItemUpdate,
  AgentTask,
  AgentTaskInsert,
  AgentTaskUpdate,
  Evidence,
  EvidenceInsert,
  EvidenceUpdate,
  Gate as GateConfig,
  GateInsert,
  GateUpdate,
  GateRun,
  GateRunInsert,
  GateRunUpdate,
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
  | 'ProjectDeleted'
  | 'TaskCreated'
  | 'TaskStarted'
  | 'TaskBlocked'
  | 'TaskCompleted'
  | 'TaskCancelled'
  | 'ArtifactProduced'
  | 'ArtifactDeleted'
  | 'GateEvaluated'
  | 'CheckpointCreated'
  | 'CheckpointDeleted'
  | 'DecisionRecorded'
  | 'DecisionDeleted'
  | 'OutcomeRecorded'
  | 'OutcomeDeleted'
  | 'ConstraintCreated'
  | 'ConstraintDeleted'
  | 'ScopeAsserted'
  | 'WorkItemCreated'
  | 'WorkItemDeleted'
  | 'WorkItemStatusChanged'
  | 'AgentTaskCreated'
  | 'AgentTaskDeleted'
  | 'AgentTaskStarted'
  | 'AgentTaskBlocked'
  | 'AgentTaskCompleted'
  | 'AgentTaskFilesTouched'
  | 'EvidenceAdded'
  | 'EvidenceDeleted'
  | 'GateConfigured'
  | 'GateExecuted';

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
 * Legacy gate configuration (deprecated - use new Gates service)
 * @deprecated Use the new Gates service with database-backed gates
 */
export interface LegacyGate {
  type: 'has_tests' | 'has_docs' | 'has_artifacts' | 'acceptance_met' | 'custom';
  config?: Record<string, any>;
}

/**
 * Legacy gate evaluation result (deprecated - use new Gates service)
 * @deprecated Use the new Gates service with database-backed gates
 */
export interface LegacyGateResult {
  passed: boolean;
  gate: LegacyGate;
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

