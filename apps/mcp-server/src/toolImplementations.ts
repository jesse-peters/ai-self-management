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
import { createServiceRoleClient } from '@projectflow/db';

/**
 * Extracts user ID from an OAuth access token
 */
async function extractUserIdFromToken(accessToken: string): Promise<string> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const audience = `${appUrl}/api/mcp`;
    const claims = await verifyAccessToken(accessToken, audience);
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
  const userId = await extractUserIdFromToken(accessToken);
  const client = createServiceRoleClient();

  const { data: project, error } = await (client
    .from('projects')
    .insert([{
      user_id: userId,
      name: params.name as string,
      description: params.description as string | undefined || null,
      rules: (params.rules as any) || {},
    }] as any)
    .select()
    .single() as any);

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  if (!project) {
    throw new Error('Failed to retrieve created project');
  }

  return project as Project;
}

/**
 * Implements pm.list_projects tool
 */
export async function implementListProjects(accessToken: string): Promise<Project[]> {
  const userId = await extractUserIdFromToken(accessToken);
  const client = createServiceRoleClient();
  // Filter to projects belonging to the authenticated user
  const { data: projects, error } = await client
    .from('projects')
    .select('*')
    .eq('user_id', userId) as any;

  if (error) {
    throw new Error(`Failed to list projects: ${error.message}`);
  }

  return projects || [];
}

/**
 * Implements pm.create_task tool (enhanced with acceptance criteria, constraints, dependencies)
 */
export async function implementCreateTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task> {
  const client = createServiceRoleClient();
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
  const client = createServiceRoleClient();
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
  const client = createServiceRoleClient();
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
  const client = createServiceRoleClient();
  return getProjectContext(client, params.projectId as string);
}

/**
 * Implements pm.pick_next_task tool
 */
export async function implementPickNextTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task | null> {
  const client = createServiceRoleClient();
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
  const client = createServiceRoleClient();
  return startTask(client, params.taskId as string);
}

/**
 * Implements pm.block_task tool
 */
export async function implementBlockTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task> {
  const client = createServiceRoleClient();
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
  const client = createServiceRoleClient();
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
  const client = createServiceRoleClient();
  return evaluateGates(client, params.taskId as string);
}

/**
 * Implements pm.complete_task tool
 */
export async function implementCompleteTask(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Task> {
  const client = createServiceRoleClient();
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
  const userId = await extractUserIdFromToken(accessToken);
  const changeset = params.changesetManifest as ChangesetManifest;
  return assertInScope(userId, params.taskId as string, changeset);
}

