/**
 * Work Items service - handles all work item-related business logic
 * 
 * Work items represent external ticket/issue references that group related agent tasks.
 * 
 * IMPORTANT: This service uses RLS for security.
 * All functions accept an authenticated SupabaseClient.
 */

import type { WorkItem, WorkItemInsert, WorkItemUpdate, Database, AgentTask } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { emitEvent } from '../events';
import { getProject } from './projects';
import { createAgentTask } from './agentTasks';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Work item summary with task counts and gate status
 */
export interface WorkItemSummary extends WorkItem {
  total_tasks: number;
  done_tasks: number;
  doing_tasks: number;
  blocked_tasks: number;
  evidence_count: number;
  gate_status?: {
    all_passing: boolean;
    required_failing: string[];
  };
}

/**
 * Creates a new work item
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to create work item in
 * @param data Work item data to create (project_id and user_id are set internally)
 * @returns The created work item
 * @throws ValidationError if data is invalid
 * @throws NotFoundError if project not found
 * 
 * RLS automatically sets user_id from authenticated context.
 */
export async function createWorkItem(
  client: SupabaseClient<Database>,
  projectId: string,
  data: Omit<WorkItemInsert, 'project_id' | 'user_id'>
): Promise<WorkItem> {
  try {
    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Work item title is required');
    }

    // Verify user owns the project
    await getProject(client, projectId);

    // Get userId from auth context (required for RLS policy)
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      throw new ValidationError('User authentication required');
    }

    // Build insert data with user_id (required by RLS policy)
    const insertData: any = {
      project_id: projectId,
      user_id: user.id,
      title: data.title.trim(),
      description: data.description || null,
      external_url: data.external_url || null,
      status: data.status || 'open',
    };

    const { data: workItem, error } = await client
      .from('work_items')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!workItem) {
      throw new NotFoundError('Failed to retrieve created work item');
    }

    // Emit WorkItemCreated event (userId already retrieved above)
    // Pass authenticated client for RLS to work
    if (user.id) {
      await emitEvent({
        project_id: projectId,
        user_id: user.id,
        event_type: 'WorkItemCreated',
        payload: {
          work_item_id: workItem.id,
          title: workItem.title,
          description: workItem.description,
          external_url: workItem.external_url,
          status: workItem.status,
        },
      }, client);
    }

    return workItem as WorkItem;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists work items for a project with optional status filter
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to list work items for
 * @param status Optional status filter
 * @returns Array of work items with summary data
 * 
 * RLS automatically filters to authenticated user's work items.
 */
export async function listWorkItems(
  client: SupabaseClient<Database>,
  projectId: string,
  status?: 'open' | 'in_progress' | 'done',
  userId?: string
): Promise<WorkItemSummary[]> {
  try {
    // Verify user owns the project
    // Pass userId to skip getUser() check for OAuth clients
    await getProject(client, projectId, userId);

    // Use the work_item_progress view for enriched data
    let query = client
      .from('work_item_progress')
      .select('*')
      .eq('project_id', projectId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: workItems, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw mapSupabaseError(error);
    }

    return (workItems || []) as WorkItemSummary[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single work item by ID with full summary
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param workItemId Work item ID to fetch
 * @returns The work item with summary data
 * @throws NotFoundError if work item not found or user doesn't own it
 * 
 * RLS ensures the user can only access their own work items.
 */
export async function getWorkItem(
  client: SupabaseClient<Database>,
  workItemId: string
): Promise<WorkItemSummary> {
  try {
    // Get work item with summary data
    const { data: workItem, error } = await client
      .from('work_item_progress')
      .select('*')
      .eq('id', workItemId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!workItem) {
      throw new NotFoundError('Work item not found');
    }

    // Get gate status for this work item
    const gateStatus = await getWorkItemGateStatus(client, workItem.project_id, workItemId);

    return {
      ...workItem,
      gate_status: gateStatus,
    } as WorkItemSummary;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Updates a work item's status with gate enforcement
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param workItemId Work item ID to update
 * @param status New status
 * @returns The updated work item
 * @throws ValidationError if status transition is not allowed
 * @throws NotFoundError if work item not found
 * 
 * Gate Rule: Cannot set status to 'done' if any required gates are failing.
 */
export async function updateWorkItemStatus(
  client: SupabaseClient<Database>,
  workItemId: string,
  status: 'open' | 'in_progress' | 'done'
): Promise<WorkItem> {
  try {
    // Get existing work item to check current state
    const { data: existingWorkItem, error: fetchError } = await client
      .from('work_items')
      .select('*')
      .eq('id', workItemId)
      .single();

    if (fetchError) {
      throw mapSupabaseError(fetchError);
    }

    if (!existingWorkItem) {
      throw new NotFoundError('Work item not found');
    }

    // Enforce gate rule when marking as done
    if (status === 'done') {
      const gateStatus = await getWorkItemGateStatus(
        client,
        existingWorkItem.project_id,
        workItemId
      );

      if (!gateStatus.all_passing && gateStatus.required_failing.length > 0) {
        throw new ValidationError(
          `Cannot close work item: required gate(s) failing: ${gateStatus.required_failing.join(', ')}`
        );
      }
    }

    // Update status
    const { data: updatedWorkItem, error: updateError } = await client
      .from('work_items')
      .update({ status })
      .eq('id', workItemId)
      .select()
      .single();

    if (updateError) {
      throw mapSupabaseError(updateError);
    }

    if (!updatedWorkItem) {
      throw new NotFoundError('Failed to retrieve updated work item');
    }

    // Get userId for event
    const { data: { user } } = await client.auth.getUser();
    const userId = user?.id;

    // Emit WorkItemStatusChanged event
    if (userId && status !== existingWorkItem.status) {
      await emitEvent({
        project_id: existingWorkItem.project_id,
        user_id: userId,
        event_type: 'WorkItemStatusChanged',
        payload: {
          work_item_id: workItemId,
          old_status: existingWorkItem.status,
          new_status: status,
        },
      });
    }

    return updatedWorkItem as WorkItem;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Updates a work item (general update, not just status)
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param workItemId Work item ID to update
 * @param patch Fields to update
 * @returns The updated work item
 */
export async function updateWorkItem(
  client: SupabaseClient<Database>,
  workItemId: string,
  patch: WorkItemUpdate
): Promise<WorkItem> {
  try {
    // If status is being updated, use the status-specific function for validation
    if (patch.status !== undefined) {
      return await updateWorkItemStatus(client, workItemId, patch.status);
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (patch.title !== undefined) updateData.title = patch.title.trim();
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.external_url !== undefined) updateData.external_url = patch.external_url;

    if (Object.keys(updateData).length === 0) {
      // Nothing to update, just fetch and return
      const { data: workItem } = await client
        .from('work_items')
        .select('*')
        .eq('id', workItemId)
        .single();
      return workItem as WorkItem;
    }

    const { data: updatedWorkItem, error } = await client
      .from('work_items')
      .update(updateData)
      .eq('id', workItemId)
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!updatedWorkItem) {
      throw new NotFoundError('Failed to retrieve updated work item');
    }

    return updatedWorkItem as WorkItem;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Helper function to get gate status for a work item
 * 
 * @param client Authenticated Supabase client
 * @param projectId Project ID
 * @param workItemId Work item ID (optional, if null checks project-level gates)
 * @returns Gate status summary
 */
async function getWorkItemGateStatus(
  client: SupabaseClient<Database>,
  projectId: string,
  workItemId?: string
): Promise<{ all_passing: boolean; required_failing: string[] }> {
  try {
    // Get all required gates for the project
    const { data: gates, error: gatesError } = await client
      .from('gates')
      .select('id, name, is_required')
      .eq('project_id', projectId)
      .eq('is_required', true);

    if (gatesError) {
      throw mapSupabaseError(gatesError);
    }

    if (!gates || gates.length === 0) {
      // No required gates, so all passing
      return { all_passing: true, required_failing: [] };
    }

    const requiredFailing: string[] = [];

    // Get waived gates for this work item
    let waiverQuery = client
      .from('gate_waivers')
      .select('gate_id')
      .eq('project_id', projectId);

    if (workItemId) {
      waiverQuery = waiverQuery.eq('work_item_id', workItemId);
    }

    const { data: waivers } = await waiverQuery;
    const waivedGateIds = new Set((waivers || []).map((w: any) => w.gate_id));

    // Check latest run for each required gate
    for (const gate of gates) {
      // Skip if gate is waived
      if (waivedGateIds.has(gate.id)) {
        continue;
      }

      let query = client
        .from('gate_runs')
        .select('status')
        .eq('gate_id', gate.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (workItemId) {
        query = query.eq('work_item_id', workItemId);
      }

      const { data: runs } = await query;

      if (!runs || runs.length === 0) {
        // No runs yet for this gate, consider it failing
        requiredFailing.push(gate.name);
      } else if (runs[0].status === 'failing') {
        requiredFailing.push(gate.name);
      }
    }

    return {
      all_passing: requiredFailing.length === 0,
      required_failing: requiredFailing,
    };
  } catch (error) {
    // If we can't determine gate status, be conservative and don't block
    console.error('Error checking gate status:', error);
    return { all_passing: true, required_failing: [] };
  }
}

/**
 * Deletes a work item
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param workItemId Work item ID to delete
 * @throws NotFoundError if work item not found or user doesn't own it
 * 
 * RLS ensures the user can only delete their own work items.
 * Cascading deletes will remove all related agent tasks.
 */
export async function deleteWorkItem(
  client: SupabaseClient<Database>,
  workItemId: string
): Promise<void> {
  try {
    // Get existing work item to verify ownership and get project_id for event
    const { data: existingWorkItem, error: fetchError } = await client
      .from('work_items')
      .select('*')
      .eq('id', workItemId)
      .single();

    if (fetchError) {
      throw mapSupabaseError(fetchError);
    }

    if (!existingWorkItem) {
      throw new NotFoundError('Work item not found');
    }

    // Get userId for event
    const { data: { user } } = await client.auth.getUser();
    const userId = user?.id;

    // Delete work item (cascades to agent tasks via FK)
    const { error } = await client
      .from('work_items')
      .delete()
      .eq('id', workItemId);

    if (error) {
      throw mapSupabaseError(error);
    }

    // Emit WorkItemDeleted event
    if (userId) {
      await emitEvent({
        project_id: existingWorkItem.project_id,
        user_id: userId,
        event_type: 'WorkItemDeleted',
        payload: {
          work_item_id: workItemId,
          title: existingWorkItem.title,
        },
      });
    }
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Result type for creating work item with tasks
 */
export interface WorkItemWithTasksResult {
  workItem: WorkItem;
  tasks: AgentTask[];
  taskMappings: Array<{ key: string; taskId: string }>;
}

/**
 * Creates a new work item and sets up initial tasks with dependencies
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to create work item in
 * @param workItemData Work item data to create
 * @param tasks Array of task definitions with dependencies
 * @returns Created work item, tasks, and key-to-ID mappings
 * @throws ValidationError if data is invalid or dependencies are invalid
 * 
 * Tasks are created in topological order (no dependencies first).
 * Dependencies are specified by task keys and resolved to task IDs.
 */
export async function createWorkItemWithTasks(
  client: SupabaseClient<Database>,
  projectId: string,
  workItemData: Omit<WorkItemInsert, 'project_id' | 'user_id'>,
  tasks: Array<{
    key: string;
    type: 'research' | 'implement' | 'verify' | 'docs' | 'cleanup';
    title: string;
    goal: string;
    context?: string;
    verification?: string;
    timeboxMinutes?: number;
    risk?: 'low' | 'medium' | 'high';
    dependsOn?: string[];
  }>
): Promise<WorkItemWithTasksResult> {
  try {
    // Validate tasks array is not empty
    if (!tasks || tasks.length === 0) {
      throw new ValidationError('At least one task is required');
    }

    // Validate all task keys are unique
    const taskKeys = tasks.map(t => t.key);
    const uniqueKeys = new Set(taskKeys);
    if (taskKeys.length !== uniqueKeys.size) {
      throw new ValidationError('Task keys must be unique');
    }

    // Validate all dependency keys reference existing tasks
    const taskKeySet = new Set(taskKeys);
    for (const task of tasks) {
      if (task.dependsOn) {
        for (const depKey of task.dependsOn) {
          if (!taskKeySet.has(depKey)) {
            throw new ValidationError(`Task "${task.key}" depends on "${depKey}" which does not exist in the task list`);
          }
        }
      }
    }

    // Detect circular dependencies using topological sort
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.key, t]));

    function hasCycle(key: string): boolean {
      if (visiting.has(key)) {
        return true; // Circular dependency detected
      }
      if (visited.has(key)) {
        return false; // Already processed
      }

      visiting.add(key);
      const task = taskMap.get(key);
      if (task?.dependsOn) {
        for (const depKey of task.dependsOn) {
          if (hasCycle(depKey)) {
            return true;
          }
        }
      }
      visiting.delete(key);
      visited.add(key);
      return false;
    }

    for (const task of tasks) {
      if (hasCycle(task.key)) {
        throw new ValidationError(`Circular dependency detected involving task "${task.key}"`);
      }
    }

    // Create work item first
    const workItem = await createWorkItem(client, projectId, workItemData);

    // Build dependency graph and topological sort
    const taskKeyToId: Record<string, string> = {};
    const createdTasks: AgentTask[] = [];
    const remainingTasks = [...tasks];
    const processedKeys = new Set<string>();

    // Process tasks in topological order
    while (remainingTasks.length > 0) {
      let progressMade = false;

      for (let i = remainingTasks.length - 1; i >= 0; i--) {
        const task = remainingTasks[i];
        const canProcess = !task.dependsOn || task.dependsOn.every(depKey => processedKeys.has(depKey));

        if (canProcess) {
          // Resolve dependencies to task IDs
          const dependsOnIds: string[] = [];
          if (task.dependsOn) {
            for (const depKey of task.dependsOn) {
              const depTaskId = taskKeyToId[depKey];
              if (depTaskId) {
                dependsOnIds.push(depTaskId);
              }
            }
          }

          // Create the task
          const createdTask = await createAgentTask(client, projectId, {
            work_item_id: workItem.id,
            type: task.type,
            title: task.title,
            goal: task.goal,
            context: task.context || null,
            inputs: null,
            output_expectation: null,
            verification: task.verification || null,
            status: 'ready',
            depends_on_ids: dependsOnIds,
            risk: task.risk || 'low',
            timebox_minutes: task.timeboxMinutes || 15,
            task_key: null,
            expected_files: [],
            touched_files: [],
            subtasks: null,
            gates: null,
          });

          // Update task_key field
          await client
            .from('agent_tasks')
            .update({ task_key: task.key })
            .eq('id', createdTask.id);

          // Store mapping and mark as processed
          taskKeyToId[task.key] = createdTask.id;
          createdTasks.push(createdTask);
          processedKeys.add(task.key);
          remainingTasks.splice(i, 1);
          progressMade = true;
        }
      }

      if (!progressMade) {
        // This should not happen if validation passed, but handle it gracefully
        throw new ValidationError('Unable to resolve task dependencies - possible circular dependency');
      }
    }

    return {
      workItem,
      tasks: createdTasks,
      taskMappings: Object.entries(taskKeyToId).map(([key, taskId]) => ({
        key,
        taskId,
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

