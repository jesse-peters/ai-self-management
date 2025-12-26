/**
 * Service functions index
 * Re-exports all service functions for easy access
 */

export { createProject, listProjects, getProject } from './projects';
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


