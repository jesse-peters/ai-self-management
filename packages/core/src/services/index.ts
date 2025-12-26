/**
 * Service functions index
 * Re-exports all service functions for easy access
 */

export { createProject, listProjects, getProject } from './projects';
export { initProject, type InitResult, type InitOptions } from './init';
export { getProjectStatus, type ProjectStatus } from './status';
export { createTask, listTasks, updateTask, getTask } from './tasks';
export { saveSessionContext, getLatestSession, getProjectContext } from './sessions';
export { pickNextTask, startTask, blockTask, completeTask } from './taskLifecycle';
export type { TaskPickingStrategy } from './taskLifecycle';
export { appendArtifact, listArtifacts } from './artifacts';
export {
  createCheckpoint,
  getCheckpoint,
  listCheckpoints,
  getLatestCheckpoint,
} from './checkpoints';
export {
  recordDecision,
  listDecisions,
  getDecision,
  type DecisionRecordResult,
} from './decisions';
export {
  createConstraint,
  listConstraints,
  getConstraint,
  evaluateConstraints,
  deleteConstraint,
  type ConstraintScope,
  type ConstraintTrigger,
  type ConstraintEnforcement,
  type ConstraintContext,
  type ConstraintEvaluationResult,
} from './constraints';
export {
  recordOutcome,
  listOutcomes,
  getOutcomesBySubject,
  getOutcome,
  type OutcomeSubjectType,
  type OutcomeResult,
  type OutcomeCreatedBy,
} from './outcomes';
export {
  recall,
  type MemoryRecallContext,
  type MemoryRecallResult,
} from './memory';
export {
  startWizard,
  submitWizardStep,
  finishWizard,
  cancelWizard,
  getWizardSession,
  getProjectSpec,
  type WizardSession,
} from './wizard';
export {
  createWorkItem,
  listWorkItems,
  getWorkItem,
  updateWorkItemStatus,
  updateWorkItem,
  type WorkItemSummary,
} from './workItems';
export {
  createAgentTask,
  listAgentTasks,
  getAgentTask,
  updateTaskStatus,
  updateAgentTask,
  addDependency,
  type AgentTaskFilters,
  type AgentTaskWithDetails,
} from './agentTasks';
export {
  addEvidence,
  listEvidence,
  getEvidenceCount,
  getEvidence,
  type EvidenceType,
  type EvidenceCreatedBy,
} from './evidence';
// Gates exports moved to server.ts (server-only) to avoid importing Node.js modules in browser
// Import types from separate type-only file (safe for client-side)
export type {
  GateRunnerMode,
  GateRunStatus,
  GateConfigInput,
  GateStatusSummary,
} from './gatesTypes';
// Manifest functions moved to server.ts (server-only) to avoid Node.js file system modules in browser
// Types are safe to export
export type {
  ProjectManifest,
  LocalManifest,
  ManifestData,
} from './manifest';
export {
  getInterviewQuestions,
  processInterviewResponses,
  generateConventionsMarkdown,
  generateReconProfile,
  saveProjectConventions,
  type InterviewQuestion,
  type InterviewSession,
  type InterviewResult,
  type ProjectConventions,
  type ReconProfile,
  type ReconCommand,
  type ReconFilePattern,
} from './interview';
// Recon functions moved to server.ts (server-only) to avoid Node.js modules in browser
export {
  analyzeCommand,
  isSafeCommand,
  redactSecrets,
  getAllDangerousPatterns,
  SAFE_COMMAND_CATEGORIES,
  type DangerousPattern,
  type CommandAnalysis,
} from './dangerousCommands';
// Primer functions moved to server.ts (server-only) to avoid Node.js file system modules in browser
// Types are safe to export
export type {
  PrimerGenerationResult,
  PrimerContent,
} from './primer';
