/**
 * Tool implementation functions that wrap core services
 * All tools use the pm.* prefix
 */

import {
  createProject,
  listProjects,
  createTask,
  listTasks,
  updateTask,
  getProjectContext,
  pickNextTask,
  startTask,
  blockTask,
  completeTask,
  appendArtifact,
  evaluateGates,
  createCheckpoint,
  recordDecision,
  assertInScope,
  verifyAccessToken,
} from '@projectflow/core';
import type {
  Project,
  Task,
  ProjectContext,
  Artifact,
  GateResult,
  Checkpoint,
  Decision,
  ScopeResult,
  TaskPickingStrategy,
  ChangesetManifest,
} from '@projectflow/core';
import { createOAuthScopedClient } from '@projectflow/db';

/**
 * Extracts user ID from an OAuth access token
 */
async function extractUserIdFromToken(accessToken: string): Promise<string> {
  try {
    const claims = await verifyAccessToken(
      accessToken,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    );
    return claims.sub;
  } catch (error) {
    throw new Error(`Failed to verify access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Implements pm.create_project tool
 */
export async function implementCreateProject(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Project> {
  const client = createOAuthScopedClient(accessToken);
  const projectData: any = {
    name: params.name as string,
    description: params.description as string | undefined,
  };
  
  // Add rules if provided
  if (params.rules) {
    projectData.rules = params.rules;
  }
  
  return createProject(client, projectData);
}

/**
 * Implements pm.list_projects tool
 */
export async function implementListProjects(accessToken: string): Promise<Project[]> {
  const client = createOAuthScopedClient(accessToken);
  return listProjects(client);
}

/**
 * Implements pm.create_task tool (enhanced with acceptance criteria, constraints, dependencies)
 */
export async function implementCreateTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task> {
  const client = createOAuthScopedClient(accessToken);
  const taskData: any = {
    title: params.title as string,
    description: params.description as string | undefined,
    status: (params.status as 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled' | undefined) || 'todo',
    priority: params.priority as 'low' | 'medium' | 'high' | undefined,
  };
  
  // Add enhanced fields if provided
  if (params.acceptanceCriteria) {
    taskData.acceptance_criteria = params.acceptanceCriteria as string[];
  }
  if (params.constraints) {
    taskData.constraints = params.constraints as Record<string, any>;
  }
  if (params.dependencies) {
    taskData.dependencies = params.dependencies as string[];
  }
  
  return createTask(client, params.projectId as string, taskData);
}

/**
 * Implements pm.list_tasks tool
 */
export async function implementListTasks(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task[]> {
  const client = createOAuthScopedClient(accessToken);
  return listTasks(client, params.projectId as string, {
    status: params.status as 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled' | undefined,
    priority: params.priority as 'low' | 'medium' | 'high' | undefined,
  });
}

/**
 * Implements pm.update_task tool
 */
export async function implementUpdateTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task> {
  const client = createOAuthScopedClient(accessToken);
  return updateTask(client, params.taskId as string, {
    title: params.title as string | undefined,
    description: params.description as string | undefined,
    status: params.status as 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled' | undefined,
    priority: params.priority as 'low' | 'medium' | 'high' | null | undefined,
  });
}

/**
 * Implements pm.get_context tool (renamed from get_project_context)
 */
export async function implementGetContext(
  accessToken: string,
  params: Record<string, unknown>
): Promise<ProjectContext> {
  const client = createOAuthScopedClient(accessToken);
  return getProjectContext(client, params.projectId as string);
}

/**
 * Implements pm.pick_next_task tool
 */
export async function implementPickNextTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task | null> {
  const client = createOAuthScopedClient(accessToken);
  return pickNextTask(
    client,
    params.projectId as string,
    (params.strategy as TaskPickingStrategy | undefined) || 'dependencies',
    params.lockedBy as string | undefined
  );
}

/**
 * Implements pm.start_task tool
 */
export async function implementStartTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task> {
  const client = createOAuthScopedClient(accessToken);
  return startTask(client, params.taskId as string);
}

/**
 * Implements pm.block_task tool
 */
export async function implementBlockTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task> {
  const client = createOAuthScopedClient(accessToken);
  return blockTask(
    client,
    params.taskId as string,
    params.reason as string,
    (params.needsHuman as boolean | undefined) || false
  );
}

/**
 * Implements pm.append_artifact tool
 */
export async function implementAppendArtifact(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Artifact> {
  const client = createOAuthScopedClient(accessToken);
  return appendArtifact(client, params.taskId as string, {
    type: params.type as 'diff' | 'pr' | 'test_report' | 'document' | 'other',
    ref: params.ref as string,
    summary: params.summary as string | undefined,
  });
}

/**
 * Implements pm.evaluate_gates tool
 */
export async function implementEvaluateGates(
  accessToken: string,
  params: Record<string, unknown>
): Promise<GateResult[]> {
  const client = createOAuthScopedClient(accessToken);
  return evaluateGates(client, params.taskId as string);
}

/**
 * Implements pm.complete_task tool
 */
export async function implementCompleteTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task> {
  const client = createOAuthScopedClient(accessToken);
  return completeTask(
    client,
    params.taskId as string,
    params.artifactIds as string[] | undefined
  );
}

/**
 * Implements pm.create_checkpoint tool
 */
export async function implementCreateCheckpoint(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Checkpoint> {
  const userId = await extractUserIdFromToken(accessToken);
  return createCheckpoint(userId, params.projectId as string, {
    label: params.label as string,
    repoRef: params.repoRef as string | undefined,
    summary: params.summary as string,
    resumeInstructions: params.resumeInstructions as string | undefined,
  });
}

/**
 * Implements pm.record_decision tool
 */
export async function implementRecordDecision(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Decision> {
  const userId = await extractUserIdFromToken(accessToken);
  return recordDecision(userId, params.projectId as string, {
    title: params.title as string,
    options: params.options as any[],
    choice: params.choice as string,
    rationale: params.rationale as string,
  });
}

/**
 * Implements pm.assert_in_scope tool
 */
export async function implementAssertInScope(
  accessToken: string,
  params: Record<string, unknown>
): Promise<ScopeResult> {
  const client = createOAuthScopedClient(accessToken);
  const changeset = params.changesetManifest as ChangesetManifest;
  return assertInScope(client, params.taskId as string, changeset);
}

