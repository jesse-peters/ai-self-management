/**
 * Tool implementation functions that wrap core services
 */

import {
  createProject,
  listProjects,
  createTask,
  listTasks,
  updateTask,
  getProjectContext,
  saveSessionContext,
} from '@projectflow/core';
import type { Project, Task, ProjectContext, AgentSession } from '@projectflow/core';

/**
 * Implements create_project tool
 */
export async function implementCreateProject(
  userId: string,
  params: Record<string, unknown>
): Promise<Project> {
  return createProject(userId, {
    name: params.name as string,
    description: params.description as string | undefined,
  });
}

/**
 * Implements list_projects tool
 */
export async function implementListProjects(userId: string): Promise<Project[]> {
  return listProjects(userId);
}

/**
 * Implements create_task tool
 */
export async function implementCreateTask(
  userId: string,
  params: Record<string, unknown>
): Promise<Task> {
  return createTask(userId, params.projectId as string, {
    title: params.title as string,
    description: params.description as string | undefined,
    status: params.status as 'todo' | 'in_progress' | 'done' | undefined,
    priority: params.priority as 'low' | 'medium' | 'high' | undefined,
  });
}

/**
 * Implements list_tasks tool
 */
export async function implementListTasks(
  userId: string,
  params: Record<string, unknown>
): Promise<Task[]> {
  return listTasks(userId, params.projectId as string, {
    status: params.status as 'todo' | 'in_progress' | 'done' | undefined,
    priority: params.priority as 'low' | 'medium' | 'high' | undefined,
  });
}

/**
 * Implements update_task tool
 */
export async function implementUpdateTask(
  userId: string,
  params: Record<string, unknown>
): Promise<Task> {
  return updateTask(userId, params.taskId as string, {
    title: params.title as string | undefined,
    description: params.description as string | undefined,
    status: params.status as 'todo' | 'in_progress' | 'done' | undefined,
    priority: params.priority as 'low' | 'medium' | 'high' | null | undefined,
  });
}

/**
 * Implements get_project_context tool
 */
export async function implementGetProjectContext(
  userId: string,
  params: Record<string, unknown>
): Promise<ProjectContext> {
  return getProjectContext(userId, params.projectId as string);
}

/**
 * Implements save_session_context tool
 */
export async function implementSaveSessionContext(
  userId: string,
  params: Record<string, unknown>
): Promise<AgentSession> {
  return saveSessionContext(
    userId,
    params.projectId as string,
    params.snapshot as Record<string, unknown>,
    params.summary as string | undefined
  );
}

