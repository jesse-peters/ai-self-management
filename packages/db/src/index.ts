/**
 * @projectflow/db
 * Database client and types for ProjectFlow
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
  Database,
} from './types';

// Export client functions
export { createServerClient, createBrowserClient, createServiceRoleClient } from './client';

