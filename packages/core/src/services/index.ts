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
} from './decisions';
export {
  createOAuthToken,
  validateAccessToken,
  refreshAccessToken,
  revokeToken,
  revokeRefreshToken,
  cleanupExpiredTokens,
  getTokenByAccessToken,
  generateAuthorizationCode,
  verifyPKCE,
} from './oauth';
export type { OAuthToken, OAuthTokenInsert } from './oauth';

