/**
 * Task service - handles all task-related business logic
 */

import { createServerClient } from '@projectflow/db';
import type { Task, TaskInsert, TaskUpdate } from '@projectflow/db';
import { UnauthorizedError, NotFoundError, mapSupabaseError } from '../errors';
import { validateUUID, validateTaskData } from '../validation';
import type { TaskFilters } from '../types';
import { getProject } from './projects';

/**
 * Creates a new task for a project
 */
export async function createTask(
  userId: string,
  projectId: string,
  data: TaskInsert
): Promise<Task> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');
    validateTaskData(data);

    // Verify user owns the project
    await getProject(userId, projectId);

    const supabase = createServerClient();

    const { data: task, error } = await (supabase
      .from('tasks')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          title: data.title,
          description: data.description || null,
          status: data.status || 'todo',
          priority: data.priority || null,
        },
      ] as any)
      .select()
      .single() as any);

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!task) {
      throw new NotFoundError('Failed to retrieve created task');
    }

    return task as Task;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists tasks for a project with optional filters
 */
export async function listTasks(
  userId: string,
  projectId: string,
  filters?: TaskFilters
): Promise<Task[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Verify user owns the project
    await getProject(userId, projectId);

    const supabase = createServerClient();

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data: tasks, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw mapSupabaseError(error);
    }

    return (tasks || []) as Task[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Updates a task
 */
export async function updateTask(
  userId: string,
  taskId: string,
  patch: TaskUpdate
): Promise<Task> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(taskId, 'taskId');
    validateTaskData(patch);

    const supabase = createServerClient();

    // Get the task to verify ownership
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      throw mapSupabaseError(fetchError);
    }

    if (!existingTask) {
      throw new UnauthorizedError('Task not found or you do not have permission to update it');
    }

    // Prepare update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (patch.title !== undefined) updateData.title = patch.title;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.priority !== undefined) updateData.priority = patch.priority;

    const { data: updatedTask, error: updateError } = await (supabase as any)
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw mapSupabaseError(updateError);
    }

    if (!updatedTask) {
      throw new NotFoundError('Failed to retrieve updated task');
    }

    return updatedTask as Task;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

