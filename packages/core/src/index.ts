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
} from './types';

// Export services
export {
  createProject,
  listProjects,
  getProject,
  createTask,
  listTasks,
  updateTask,
  saveSessionContext,
  getLatestSession,
  getProjectContext,
} from './services';

// Export errors
export {
  ProjectFlowError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  mapSupabaseError,
} from './errors';

