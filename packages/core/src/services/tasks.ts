/**
 * Task service - handles all task-related business logic
 */

import { createServerClient } from '@projectflow/db';
import type { Task, TaskInsert, TaskUpdate } from '@projectflow/db';
import { UnauthorizedError, NotFoundError, mapSupabaseError } from '../errors';
import { validateUUID, validateTaskData } from '../validation';
import type { TaskFilters } from '../types';
import { getProject } from './projects';
import { emitEvent } from '../events';

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

    // Build insert data with enhanced fields
    const insertData: any = {
      project_id: projectId,
      user_id: userId,
      title: data.title,
      description: data.description || null,
      status: data.status || 'todo',
      priority: data.priority || null,
    };
    
    // Add enhanced fields if present in data
    if ((data as any).acceptance_criteria !== undefined) {
      insertData.acceptance_criteria = (data as any).acceptance_criteria;
    }
    if ((data as any).constraints !== undefined) {
      insertData.constraints = (data as any).constraints;
    }
    if ((data as any).dependencies !== undefined) {
      insertData.dependencies = (data as any).dependencies;
    }

    const { data: task, error } = await (supabase
      .from('tasks')
      .insert([insertData] as any)
      .select()
      .single() as any);

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!task) {
      throw new NotFoundError('Failed to retrieve created task');
    }

    // Emit TaskCreated event
    await emitEvent({
      project_id: projectId,
      task_id: task.id,
      user_id: userId,
      event_type: 'TaskCreated',
      payload: {
        task_id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority || null,
        acceptance_criteria: (task as any).acceptance_criteria || [],
        constraints: (task as any).constraints || {},
        dependencies: (task as any).dependencies || [],
      },
    });

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
 * Gets a single task by ID, verifying the user owns it
 */
export async function getTask(userId: string, taskId: string): Promise<Task> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(taskId, 'taskId');

    const supabase = createServerClient();

    const { data: task, error } = await (supabase as any)
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!task) {
      throw new NotFoundError('Task not found');
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

    // Emit events for status changes
    if (patch.status && patch.status !== existingTask.status) {
      const eventType = patch.status === 'done' ? 'TaskCompleted' :
                       patch.status === 'blocked' ? 'TaskBlocked' :
                       patch.status === 'cancelled' ? 'TaskCancelled' :
                       patch.status === 'in_progress' ? 'TaskStarted' : null;

      if (eventType) {
        await emitEvent({
          project_id: existingTask.project_id,
          task_id: taskId,
          user_id: userId,
          event_type: eventType,
          payload: {
            task_id: taskId,
            ...(eventType === 'TaskStarted' ? {
              locked_at: (updatedTask as any).locked_at || new Date().toISOString(),
              locked_by: (updatedTask as any).locked_by || null,
            } : {}),
            ...(eventType === 'TaskBlocked' ? {
              reason: 'Status updated to blocked',
              needs_human: false,
            } : {}),
            ...(eventType === 'TaskCompleted' ? {
              artifacts: [],
            } : {}),
          },
        });
      }
    }

    return updatedTask as Task;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

