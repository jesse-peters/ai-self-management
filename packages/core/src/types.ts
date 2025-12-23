/**
 * Domain types for ProjectFlow
 * Re-exports database types and defines domain-specific types
 */

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
} from '@projectflow/db';

/**
 * Task status enum
 */
export type TaskStatus = 'todo' | 'in_progress' | 'done';

/**
 * Task priority enum
 */
export type TaskPriority = 'low' | 'medium' | 'high';

/**
 * Filters for querying tasks
 */
export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
}

/**
 * Combined project context with all related data
 */
export interface ProjectContext {
  project: any; // Project type from @projectflow/db
  tasks: any[]; // Task[] from @projectflow/db
  latestSession: any | null; // AgentSession | null from @projectflow/db
}

