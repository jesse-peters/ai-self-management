/**
 * Service functions index
 * Re-exports all service functions for easy access
 */

export { createProject, listProjects, getProject } from './projects';
export { createTask, listTasks, updateTask } from './tasks';
export { saveSessionContext, getLatestSession, getProjectContext } from './sessions';

