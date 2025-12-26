/**
 * @projectflow/core
 * Domain logic layer for ProjectFlow
 */

// Export types
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
  TaskStatus,
  TaskPriority,
  TaskFilters,
  ProjectContext,
  LegacyGate,
  LegacyGateResult,
  ChangesetManifest,
  ScopeResult,
  TaskConstraints,
  ProjectRules,
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
  GateConfig,
  GateInsert,
  GateUpdate,
  GateRun,
  GateRunInsert,
  GateRunUpdate,
} from './types';

// Export services
export {
  createProject,
  listProjects,
  getProject,
  initProject,
  getProjectStatus,
  createTask,
  listTasks,
  updateTask,
  getTask,
  saveSessionContext,
  getLatestSession,
  getProjectContext,
  // Task lifecycle
  pickNextTask,
  startTask,
  blockTask,
  completeTask,
  // Artifacts
  appendArtifact,
  listArtifacts,
  // Checkpoints
  createCheckpoint,
  getCheckpoint,
  listCheckpoints,
  getLatestCheckpoint,
  // Decisions
  recordDecision,
  listDecisions,
  getDecision,
  type DecisionRecordResult,
  // Constraints
  createConstraint,
  listConstraints,
  getConstraint,
  evaluateConstraints,
  deleteConstraint,
  // Outcomes
  recordOutcome,
  listOutcomes,
  getOutcomesBySubject,
  getOutcome,
  // Memory recall
  recall,
  // Wizard
  startWizard,
  submitWizardStep,
  finishWizard,
  cancelWizard,
  getWizardSession,
  getProjectSpec,
  // Work Items
  createWorkItem,
  listWorkItems,
  getWorkItem,
  updateWorkItemStatus,
  updateWorkItem,
  // Agent Tasks
  createAgentTask,
  listAgentTasks,
  getAgentTask,
  updateTaskStatus,
  updateAgentTask,
  addDependency,
  // Evidence
  addEvidence,
  listEvidence,
  getEvidenceCount,
  getEvidence,
  // Interview
  getInterviewQuestions,
  processInterviewResponses,
  generateConventionsMarkdown,
  generateReconProfile,
  saveProjectConventions,
  // Manifest, Recon, Primer, and server-only functions are in './server'
  // For functions that execute commands or do file I/O, import from '@projectflow/core/server'
} from './services';

// Export task lifecycle types
export type { TaskPickingStrategy } from './services';
export type { InitResult, InitOptions } from './services';
export type { ProjectStatus } from './services';

// Export constraint types
export type {
  ConstraintScope,
  ConstraintTrigger,
  ConstraintEnforcement,
  ConstraintContext,
  ConstraintEvaluationResult,
} from './services';

// Export outcome types
export type {
  OutcomeSubjectType,
  OutcomeResult,
  OutcomeCreatedBy,
} from './services';

// Export memory recall types
export type {
  MemoryRecallContext,
  MemoryRecallResult,
} from './services';

// Export wizard types
export type {
  WizardSession,
} from './services';

// Export work item types
export type {
  WorkItemSummary,
} from './services';

// Export agent task types
export type {
  AgentTaskFilters,
  AgentTaskWithDetails,
} from './services';

// Export evidence types
export type {
  EvidenceType,
  EvidenceCreatedBy,
} from './services';

// Export gates types (types are safe to import in browser)
export type {
  GateRunnerMode,
  GateRunStatus,
  GateConfigInput,
  GateStatusSummary,
} from './services';

// Export manifest types
export type {
  ProjectManifest,
  LocalManifest,
  ManifestData,
} from './services';

// Export interview types
export type {
  InterviewQuestion,
  InterviewSession,
  InterviewResult,
  ProjectConventions,
  ReconProfile,
  ReconCommand,
  ReconFilePattern,
} from './services';

// Note: Gate execution functions (configureGates, runGate, etc.) are server-only
// Import from '@projectflow/core/server' if you need them on the server-side

// Export JWT types and functions
export {
  verifyAccessToken,
  type MCPTokenClaims,
} from './services/jwt';

// Export errors
export {
  ProjectFlowError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  mapSupabaseError,
} from './errors';

// Export error handling utilities (server-side only)
export {
  captureError,
  setRequestContext,
  setUserContext,
  type ErrorContext,
  type CaptureOptions,
} from './errors/sentry';

// Export service error handler
export {
  withServiceErrorHandler,
  handleServiceError,
} from './errors/serviceHandler';

// Export event sourcing
export {
  appendEvent,
  getProjectEvents,
  getTaskEvents,
  getEventsSince,
  getEventsByType,
  getEvent,
  registerEventHandler,
  processEvent,
  initializeEventHandlers,
  emitEvent,
  type EventHandler,
  type BaseEvent,
  type ProjectCreatedPayload,
  type TaskCreatedPayload,
  type TaskStartedPayload,
  type TaskBlockedPayload,
  type TaskCompletedPayload,
  type TaskCancelledPayload,
  type ArtifactProducedPayload,
  type GateEvaluatedPayload,
  type CheckpointCreatedPayload,
  type DecisionRecordedPayload,
  type OutcomeRecordedPayload,
  type ConstraintCreatedPayload,
  type ConstraintDeletedPayload,
  type ScopeAssertedPayload,
  type WorkItemCreatedPayload,
  type WorkItemStatusChangedPayload,
  type AgentTaskCreatedPayload,
  type AgentTaskStartedPayload,
  type AgentTaskBlockedPayload,
  type AgentTaskCompletedPayload,
  type EvidenceAddedPayload,
  type GateConfiguredPayload,
  type GateExecutedPayload,
} from './events';

// Export gate evaluator
export { evaluateGates } from './gates/evaluator';

// Export scope checker
export { assertInScope } from './scope/checker';

