/**
 * Task service - handles all task-related business logic
 * 
 * IMPORTANT: This service now uses RLS for security.
 * All functions accept an authenticated SupabaseClient.
 */

import type { Task, TaskInsert, TaskUpdate, Database } from '@projectflow/db';
import { UnauthorizedError, NotFoundError, mapSupabaseError } from '../errors';
import { validateTaskData } from '../validation';
import type { TaskFilters } from '../types';
import { getProject } from './projects';
import { emitEvent } from '../events';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Creates a new task for a project
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to create task in
 * @param data Task data to create
 * @returns The created task
 * 
 * RLS automatically sets user_id from authenticated context.
 */
export async function createTask(
  client: SupabaseClient<Database>,
  projectId: string,
  data: TaskInsert
): Promise<Task> {
  try {
    validateTaskData(data);

    // Verify user owns the project
    await getProject(client, projectId);

    // Build insert data with enhanced fields
    const insertData: any = {
      project_id: projectId,
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

    const { data: task, error } = await (client
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

    // Get userId and project info for event
    const { data: { user } } = await client.auth.getUser();
    const userId = user?.id;

    // Emit TaskCreated event
    if (userId) {
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
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to list tasks for
 * @param filters Optional filters (status, priority)
 * @returns Array of tasks
 * 
 * RLS automatically filters to authenticated user's tasks.
 */
export async function listTasks(
  client: SupabaseClient<Database>,
  projectId: string,
  filters?: TaskFilters
): Promise<Task[]> {
  try {
    // Verify user owns the project
    await getProject(client, projectId);

    let query = client
      .from('tasks')
      .select('*')
      .eq('project_id', projectId);

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
 * Gets a single task by ID
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID to fetch
 * @returns The task
 * @throws NotFoundError if task not found or user doesn't own it
 * 
 * RLS ensures the user can only access their own tasks.
 */
export async function getTask(
  client: SupabaseClient<Database>,
  taskId: string
): Promise<Task> {
  try {
    const { data: task, error } = await (client as any)
      .from('tasks')
      .select('*')
      .eq('id', taskId)
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
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID to update
 * @param patch Fields to update
 * @returns The updated task
 * 
 * RLS ensures the user can only update their own tasks.
 */
export async function updateTask(
  client: SupabaseClient<Database>,
  taskId: string,
  patch: TaskUpdate
): Promise<Task> {
  try {
    validateTaskData(patch);

    // Get the task to verify ownership and check for status changes
    const { data: existingTask, error: fetchError } = await client
      .from('tasks')
      .select('*')
      .eq('id', taskId)
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

    const { data: updatedTask, error: updateError } = await (client as any)
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      throw mapSupabaseError(updateError);
    }

    if (!updatedTask) {
      throw new NotFoundError('Failed to retrieve updated task');
    }

    // Get userId for event
    const { data: { user } } = await client.auth.getUser();
    const userId = user?.id;

    // Emit events for status changes
    if (patch.status && patch.status !== existingTask.status && userId) {
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

