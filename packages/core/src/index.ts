/**
 * @projectflow/core
 * Domain logic layer for ProjectFlow
 */

// Export types
export type {
  Project,
  Task,
  AgentSession,
  ProjectInsert,
  ProjectUpdate,
  TaskInsert,
  TaskUpdate,
  AgentSessionInsert,
  AgentSessionUpdate,
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
  // OAuth services
  createOAuthToken,
  validateAccessToken,
  refreshAccessToken,
  revokeToken,
  revokeRefreshToken,
  cleanupExpiredTokens,
  getTokenByAccessToken,
  generateAuthorizationCode,
} from './services';

// Export task lifecycle types
export type { TaskPickingStrategy } from './services';

// Export OAuth types
export type { OAuthToken, OAuthTokenInsert } from './services/oauth';

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
  type ScopeAssertedPayload,
} from './events';

// Export gate evaluator
export { evaluateGates } from './gates/evaluator';

// Export scope checker
export { assertInScope } from './scope/checker';

