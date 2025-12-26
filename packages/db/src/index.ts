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
  Constraint,
  Outcome,
  ProjectSpec,
  OAuthPendingRequest,
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
  ProjectSpecInsert,
  ProjectSpecUpdate,
  OAuthPendingRequestInsert,
  OAuthPendingRequestUpdate,
  Database,
} from './types';

// Export client functions
export { createServerClient, createBrowserClient, createServiceRoleClient, createOAuthScopedClient } from './client';

