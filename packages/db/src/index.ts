/**
 * @projectflow/db
 * Database client and types for ProjectFlow
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
  Database,
} from './types';

// Export client functions
export { createServerClient, createBrowserClient } from './client';

