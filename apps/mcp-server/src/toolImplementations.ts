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

/**
 * Implements pm.create_project tool
 */
export async function implementCreateProject(
  userId: string,
  params: Record<string, unknown>
): Promise<Project> {
  const projectData: any = {
    name: params.name as string,
    description: params.description as string | undefined,
  };
  
  // Add rules if provided
  if (params.rules) {
    projectData.rules = params.rules;
  }
  
  return createProject(userId, projectData);
}

/**
 * Implements pm.list_projects tool
 */
export async function implementListProjects(userId: string): Promise<Project[]> {
  return listProjects(userId);
}

/**
 * Implements pm.create_task tool (enhanced with acceptance criteria, constraints, dependencies)
 */
export async function implementCreateTask(
  userId: string,
  params: Record<string, unknown>
): Promise<Task> {
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
  
  return createTask(userId, params.projectId as string, taskData);
}

/**
 * Implements pm.list_tasks tool
 */
export async function implementListTasks(
  userId: string,
  params: Record<string, unknown>
): Promise<Task[]> {
  return listTasks(userId, params.projectId as string, {
    status: params.status as 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled' | undefined,
    priority: params.priority as 'low' | 'medium' | 'high' | undefined,
  });
}

/**
 * Implements pm.update_task tool
 */
export async function implementUpdateTask(
  userId: string,
  params: Record<string, unknown>
): Promise<Task> {
  return updateTask(userId, params.taskId as string, {
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
  userId: string,
  params: Record<string, unknown>
): Promise<ProjectContext> {
  return getProjectContext(userId, params.projectId as string);
}

/**
 * Implements pm.pick_next_task tool
 */
export async function implementPickNextTask(
  userId: string,
  params: Record<string, unknown>
): Promise<Task | null> {
  return pickNextTask(
    userId,
    params.projectId as string,
    (params.strategy as TaskPickingStrategy | undefined) || 'dependencies',
    params.lockedBy as string | undefined
  );
}

/**
 * Implements pm.start_task tool
 */
export async function implementStartTask(
  userId: string,
  params: Record<string, unknown>
): Promise<Task> {
  return startTask(userId, params.taskId as string);
}

/**
 * Implements pm.block_task tool
 */
export async function implementBlockTask(
  userId: string,
  params: Record<string, unknown>
): Promise<Task> {
  return blockTask(
    userId,
    params.taskId as string,
    params.reason as string,
    (params.needsHuman as boolean | undefined) || false
  );
}

/**
 * Implements pm.append_artifact tool
 */
export async function implementAppendArtifact(
  userId: string,
  params: Record<string, unknown>
): Promise<Artifact> {
  return appendArtifact(userId, params.taskId as string, {
    type: params.type as 'diff' | 'pr' | 'test_report' | 'document' | 'other',
    ref: params.ref as string,
    summary: params.summary as string | undefined,
  });
}

/**
 * Implements pm.evaluate_gates tool
 */
export async function implementEvaluateGates(
  userId: string,
  params: Record<string, unknown>
): Promise<GateResult[]> {
  return evaluateGates(userId, params.taskId as string);
}

/**
 * Implements pm.complete_task tool
 */
export async function implementCompleteTask(
  userId: string,
  params: Record<string, unknown>
): Promise<Task> {
  return completeTask(
    userId,
    params.taskId as string,
    params.artifactIds as string[] | undefined
  );
}

/**
 * Implements pm.create_checkpoint tool
 */
export async function implementCreateCheckpoint(
  userId: string,
  params: Record<string, unknown>
): Promise<Checkpoint> {
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
  userId: string,
  params: Record<string, unknown>
): Promise<Decision> {
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
  userId: string,
  params: Record<string, unknown>
): Promise<ScopeResult> {
  const changeset = params.changesetManifest as ChangesetManifest;
  return assertInScope(userId, params.taskId as string, changeset);
}

