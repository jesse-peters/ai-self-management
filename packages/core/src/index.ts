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
  Gate,
  GateResult,
  ChangesetManifest,
  ScopeResult,
  TaskConstraints,
  ProjectRules,
} from './types';

// Export services
export {
  createProject,
  listProjects,
  getProject,
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
} from './services';

// Export task lifecycle types
export type { TaskPickingStrategy } from './services';

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
} from './events';

// Export gate evaluator
export { evaluateGates } from './gates/evaluator';

// Export scope checker
export { assertInScope } from './scope/checker';

