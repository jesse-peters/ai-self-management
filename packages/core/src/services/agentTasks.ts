/**
 * Agent Tasks service - handles all agent task-related business logic
 * 
 * Agent tasks are micro work packets with clear goals and verification steps.
 * This service enforces critical invariants:
 * 1. Evidence Rule: Cannot mark task done without at least 1 evidence item
 * 2. Research Gating: Cannot start implement/verify tasks if research deps incomplete
 * 3. Blocker Rule: When blocked, requires blocker reason as evidence
 * 
 * IMPORTANT: This service uses RLS for security.
 * All functions accept an authenticated SupabaseClient.
 */

import type { AgentTask, AgentTaskInsert, AgentTaskUpdate, Database, Evidence } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { emitEvent } from '../events';
import { getProject } from './projects';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Agent task filters
 */
export interface AgentTaskFilters {
  workItemId?: string;
  status?: 'ready' | 'doing' | 'blocked' | 'review' | 'done';
  type?: 'research' | 'implement' | 'verify' | 'docs' | 'cleanup';
}

/**
 * Agent task with enriched data
 */
export interface AgentTaskWithDetails extends AgentTask {
  evidence_count: number;
  evidence_types: string[];
  work_item_title?: string;
  work_item_url?: string;
}

/**
 * Creates a new agent task
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to create task in
 * @param data Task data to create (project_id, blocked_reason, locked_at, locked_by are set internally)
 * @returns The created task
 * @throws ValidationError if data is invalid
 * @throws NotFoundError if project or work item not found
 * 
 * RLS requires user_id to be set explicitly in the insert.
 */
export async function createAgentTask(
  client: SupabaseClient<Database>,
  projectId: string,
  data: Omit<AgentTaskInsert, 'project_id' | 'blocked_reason' | 'locked_at' | 'locked_by'>
): Promise<AgentTask> {
  try {
    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Task title is required');
    }
    if (!data.goal || data.goal.trim().length === 0) {
      throw new ValidationError('Task goal is required');
    }
    if (!data.type) {
      throw new ValidationError('Task type is required');
    }

    // Verify user owns the project
    await getProject(client, projectId);

    // If work_item_id is provided, verify it exists and belongs to the project
    if (data.work_item_id) {
      const { data: workItem, error: workItemError } = await client
        .from('work_items')
        .select('id, project_id')
        .eq('id', data.work_item_id)
        .single();

      if (workItemError || !workItem) {
        throw new NotFoundError('Work item not found');
      }

      if (workItem.project_id !== projectId) {
        throw new ValidationError('Work item does not belong to the specified project');
      }
    }

    // Validate dependencies exist and belong to the same project
    if (data.depends_on_ids && data.depends_on_ids.length > 0) {
      const { data: dependencyTasks, error: depsError } = await client
        .from('agent_tasks')
        .select('id, project_id')
        .in('id', data.depends_on_ids);

      if (depsError) {
        throw mapSupabaseError(depsError);
      }

      if (!dependencyTasks || dependencyTasks.length !== data.depends_on_ids.length) {
        throw new ValidationError('One or more dependency tasks not found');
      }

      for (const depTask of dependencyTasks) {
        if (depTask.project_id !== projectId) {
          throw new ValidationError('Dependency tasks must belong to the same project');
        }
      }
    }

    // Get userId from auth context (required for RLS policy)
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      throw new ValidationError('User authentication required');
    }

    // Build insert data with user_id (required by RLS policy)
    const insertData: any = {
      project_id: projectId,
      user_id: user.id,
      work_item_id: data.work_item_id || null,
      type: data.type,
      title: data.title.trim(),
      goal: data.goal.trim(),
      context: data.context || null,
      inputs: data.inputs || null,
      output_expectation: data.output_expectation || null,
      verification: data.verification || null,
      status: data.status || 'ready',
      depends_on_ids: data.depends_on_ids || [],
      risk: data.risk || 'low',
      timebox_minutes: data.timebox_minutes || 15,
      blocked_reason: null,
      locked_at: null,
      locked_by: null,
    };

    const { data: task, error } = await client
      .from('agent_tasks')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!task) {
      throw new NotFoundError('Failed to retrieve created task');
    }

    // Emit AgentTaskCreated event (userId already retrieved above)
    if (user.id) {
      await emitEvent({
        project_id: projectId,
        user_id: user.id,
        event_type: 'AgentTaskCreated',
        payload: {
          task_id: task.id,
          work_item_id: task.work_item_id,
          type: task.type,
          title: task.title,
          goal: task.goal,
          status: task.status,
          depends_on_ids: task.depends_on_ids,
        },
      });
    }

    return task as AgentTask;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists agent tasks with optional filters
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to list tasks for
 * @param filters Optional filters (workItemId, status, type)
 * @param userId Optional user ID (if not provided, will try to get from auth context)
 * @returns Array of tasks with details
 * 
 * RLS automatically filters to authenticated user's tasks.
 */
export async function listAgentTasks(
  client: SupabaseClient<Database>,
  projectId: string,
  filters?: AgentTaskFilters,
  userId?: string
): Promise<AgentTaskWithDetails[]> {
  try {
    // Verify user owns the project
    // Pass userId to skip getUser() check for OAuth clients
    await getProject(client, projectId, userId);

    // Use the agent_task_details view for enriched data
    let query = client
      .from('agent_task_details')
      .select('*')
      .eq('project_id', projectId);

    if (filters?.workItemId) {
      query = query.eq('work_item_id', filters.workItemId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    const { data: tasks, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw mapSupabaseError(error);
    }

    return (tasks || []) as AgentTaskWithDetails[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single agent task by ID with full details
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID to fetch
 * @returns The task with details
 * @throws NotFoundError if task not found or user doesn't own it
 * 
 * RLS ensures the user can only access their own tasks.
 */
export async function getAgentTask(
  client: SupabaseClient<Database>,
  taskId: string
): Promise<AgentTaskWithDetails> {
  try {
    // Get task with details
    const { data: task, error } = await client
      .from('agent_task_details')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!task) {
      throw new NotFoundError('Agent task not found');
    }

    return task as AgentTaskWithDetails;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Updates an agent task's status with invariant enforcement
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID to update
 * @param status New status
 * @param blockedReason Required when status is 'blocked'
 * @returns The updated task
 * @throws ValidationError if invariants are violated
 * @throws NotFoundError if task not found
 * 
 * Enforces:
 * 1. Evidence Rule: Cannot mark done without at least 1 evidence item
 * 2. Research Gating: Cannot start implement/verify if research deps incomplete
 * 3. Blocker Rule: When blocked, requires blocker reason
 */
export async function updateTaskStatus(
  client: SupabaseClient<Database>,
  taskId: string,
  status: 'ready' | 'doing' | 'blocked' | 'review' | 'done',
  blockedReason?: string
): Promise<AgentTask> {
  try {
    // Get existing task to check current state
    const { data: existingTask, error: fetchError } = await client
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw mapSupabaseError(fetchError);
    }

    if (!existingTask) {
      throw new NotFoundError('Agent task not found');
    }

    // INVARIANT 1: Evidence Rule
    if (status === 'done') {
      const evidenceCount = await getEvidenceCount(client, taskId);
      if (evidenceCount === 0) {
        throw new ValidationError(
          'Cannot mark task done: requires at least 1 evidence item'
        );
      }
    }

    // INVARIANT 2: Research Gating
    if (status === 'doing' && (existingTask.type === 'implement' || existingTask.type === 'verify')) {
      const researchDepsIncomplete = await hasIncompleteResearchDependencies(
        client,
        existingTask.depends_on_ids
      );

      if (researchDepsIncomplete.incomplete) {
        throw new ValidationError(
          `Cannot start task: research dependency [${researchDepsIncomplete.taskIds.join(', ')}] is not complete`
        );
      }
    }

    // INVARIANT 3: Blocker Rule
    if (status === 'blocked') {
      if (!blockedReason || blockedReason.trim().length === 0) {
        throw new ValidationError('Blocked reason is required when marking task as blocked');
      }

      // Automatically create evidence of type 'note' with blocker reason
      await createBlockerEvidence(client, existingTask.project_id, taskId, blockedReason);
    }

    // Prepare update data
    const updateData: any = { status };

    if (status === 'blocked') {
      updateData.blocked_reason = blockedReason;
    } else if (status === 'doing') {
      updateData.locked_at = new Date().toISOString();
      updateData.locked_by = 'agent'; // Could be parameterized if needed
    } else if (status === 'done' || status === 'ready') {
      updateData.locked_at = null;
      updateData.locked_by = null;
      updateData.blocked_reason = null;
    }

    // Update task
    const { data: updatedTask, error: updateError } = await client
      .from('agent_tasks')
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

    // Emit appropriate event based on status change
    if (userId && status !== existingTask.status) {
      const eventType =
        status === 'doing' ? 'AgentTaskStarted' :
          status === 'blocked' ? 'AgentTaskBlocked' :
            status === 'done' ? 'AgentTaskCompleted' : null;

      if (eventType) {
        await emitEvent({
          project_id: existingTask.project_id,
          user_id: userId,
          event_type: eventType,
          payload: {
            task_id: taskId,
            old_status: existingTask.status,
            new_status: status,
            ...(status === 'blocked' ? { reason: blockedReason } : {}),
            ...(status === 'doing' ? { locked_at: updateData.locked_at } : {}),
          },
        });
      }
    }

    return updatedTask as AgentTask;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Records which files were touched during task execution
 * Compares against expected_files and returns warnings
 * 
 * @param client Authenticated Supabase client
 * @param taskId Task ID
 * @param files Array of file paths that were modified
 * @returns Comparison results with warnings
 */
export async function recordTouchedFiles(
  client: SupabaseClient<Database>,
  taskId: string,
  files: string[]
): Promise<{
  task: AgentTask;
  comparison: {
    expected_and_touched: string[];
    missing_expected: string[];
    unexpected_touched: string[];
    warnings: string[];
  };
}> {
  // Get current task
  const task = await getAgentTask(client, taskId);

  // Update touched_files
  const { data: updatedTask, error } = await client
    .from('agent_tasks')
    .update({ touched_files: files })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw mapSupabaseError(error);

  // Compare with expected_files
  const expected = new Set(task.expected_files || []);
  const touched = new Set(files);

  const expected_and_touched = files.filter(f => expected.has(f));
  const missing_expected = (task.expected_files || []).filter(f => !touched.has(f));
  const unexpected_touched = files.filter(f => !expected.has(f));

  const warnings: string[] = [];
  if (missing_expected.length > 0) {
    warnings.push(`Expected files not touched: ${missing_expected.join(', ')}`);
  }
  if (unexpected_touched.length > 0) {
    warnings.push(`Unexpected files touched: ${unexpected_touched.join(', ')}`);
  }

  // Get userId for event
  const { data: { user } } = await client.auth.getUser();
  const userId = user?.id;

  // Emit event
  if (userId) {
    await emitEvent({
      project_id: task.project_id,
      user_id: userId,
      event_type: 'AgentTaskFilesTouched',
      payload: {
        task_id: taskId,
        files_count: files.length,
        expected_count: expected.size,
        warnings,
      },
    }, client);
  }

  return {
    task: updatedTask as AgentTask,
    comparison: {
      expected_and_touched,
      missing_expected,
      unexpected_touched,
      warnings,
    },
  };
}

/**
 * Updates an agent task (general update, not just status)
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID to update
 * @param patch Fields to update
 * @returns The updated task
 */
export async function updateAgentTask(
  client: SupabaseClient<Database>,
  taskId: string,
  patch: AgentTaskUpdate
): Promise<AgentTask> {
  try {
    // If status is being updated, use the status-specific function for validation
    if (patch.status !== undefined) {
      return await updateTaskStatus(client, taskId, patch.status, patch.blocked_reason || undefined);
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (patch.title !== undefined) updateData.title = patch.title.trim();
    if (patch.goal !== undefined) updateData.goal = patch.goal.trim();
    if (patch.context !== undefined) updateData.context = patch.context;
    if (patch.inputs !== undefined) updateData.inputs = patch.inputs;
    if (patch.output_expectation !== undefined) updateData.output_expectation = patch.output_expectation;
    if (patch.verification !== undefined) updateData.verification = patch.verification;
    if (patch.type !== undefined) updateData.type = patch.type;
    if (patch.risk !== undefined) updateData.risk = patch.risk;
    if (patch.timebox_minutes !== undefined) updateData.timebox_minutes = patch.timebox_minutes;

    if (Object.keys(updateData).length === 0) {
      // Nothing to update, just fetch and return
      const { data: task } = await client
        .from('agent_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      return task as AgentTask;
    }

    const { data: updatedTask, error } = await client
      .from('agent_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!updatedTask) {
      throw new NotFoundError('Failed to retrieve updated task');
    }

    return updatedTask as AgentTask;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Adds a dependency to a task
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID to add dependency to
 * @param dependsOnTaskId Task ID that must be completed first
 * @returns The updated task
 */
export async function addDependency(
  client: SupabaseClient<Database>,
  taskId: string,
  dependsOnTaskId: string
): Promise<AgentTask> {
  try {
    // Get both tasks to verify they exist and belong to same project
    const { data: task, error: taskError } = await client
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new NotFoundError('Task not found');
    }

    const { data: depTask, error: depError } = await client
      .from('agent_tasks')
      .select('id, project_id')
      .eq('id', dependsOnTaskId)
      .single();

    if (depError || !depTask) {
      throw new NotFoundError('Dependency task not found');
    }

    if (depTask.project_id !== task.project_id) {
      throw new ValidationError('Dependency task must belong to the same project');
    }

    // Check if dependency already exists
    if (task.depends_on_ids.includes(dependsOnTaskId)) {
      // Already exists, just return the task
      return task as AgentTask;
    }

    // Add the dependency
    const updatedDeps = [...task.depends_on_ids, dependsOnTaskId];

    const { data: updatedTask, error: updateError } = await client
      .from('agent_tasks')
      .update({ depends_on_ids: updatedDeps })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      throw mapSupabaseError(updateError);
    }

    if (!updatedTask) {
      throw new NotFoundError('Failed to retrieve updated task');
    }

    return updatedTask as AgentTask;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Deletes an agent task
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID to delete
 * @throws NotFoundError if task not found or user doesn't own it
 * @throws ValidationError if task is locked (actively being worked on)
 * 
 * RLS ensures the user can only delete their own tasks.
 */
export async function deleteAgentTask(
  client: SupabaseClient<Database>,
  taskId: string
): Promise<void> {
  try {
    // Get existing task to verify ownership and check if locked
    const { data: existingTask, error: fetchError } = await client
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw mapSupabaseError(fetchError);
    }

    if (!existingTask) {
      throw new NotFoundError('Agent task not found');
    }

    // Check if task is locked (prevent deletion of active tasks)
    if (existingTask.locked_at) {
      const lockedAt = new Date(existingTask.locked_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lockedAt > oneHourAgo) {
        throw new ValidationError(
          'Cannot delete task: task is currently locked and may be in progress'
        );
      }
    }

    // Get userId for event
    const { data: { user } } = await client.auth.getUser();
    const userId = user?.id;

    // Delete agent task
    const { error } = await client
      .from('agent_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      throw mapSupabaseError(error);
    }

    // Emit AgentTaskDeleted event
    if (userId) {
      await emitEvent({
        project_id: existingTask.project_id,
        user_id: userId,
        event_type: 'AgentTaskDeleted',
        payload: {
          task_id: taskId,
          title: existingTask.title,
          type: existingTask.type,
          status: existingTask.status,
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the count of evidence items for a task
 */
async function getEvidenceCount(
  client: SupabaseClient<Database>,
  taskId: string
): Promise<number> {
  const { data, error } = await client
    .from('evidence')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId);

  if (error) {
    console.error('Error counting evidence:', error);
    return 0;
  }

  return (data as any)?.length || 0;
}

/**
 * Checks if any research dependencies are incomplete
 */
async function hasIncompleteResearchDependencies(
  client: SupabaseClient<Database>,
  dependencyIds: string[]
): Promise<{ incomplete: boolean; taskIds: string[] }> {
  if (!dependencyIds || dependencyIds.length === 0) {
    return { incomplete: false, taskIds: [] };
  }

  const { data: deps, error } = await client
    .from('agent_tasks')
    .select('id, type, status')
    .in('id', dependencyIds)
    .eq('type', 'research');

  if (error) {
    console.error('Error checking research dependencies:', error);
    return { incomplete: false, taskIds: [] };
  }

  const incompleteTasks = (deps || [])
    .filter((dep: any) => dep.status !== 'done')
    .map((dep: any) => dep.id);

  return {
    incomplete: incompleteTasks.length > 0,
    taskIds: incompleteTasks,
  };
}

/**
 * Creates evidence for a blocker reason
 */
async function createBlockerEvidence(
  client: SupabaseClient<Database>,
  projectId: string,
  taskId: string,
  blockedReason: string
): Promise<void> {
  // Get userId from auth context
  const { data: { user } } = await client.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    throw new ValidationError('User authentication required');
  }

  const evidenceData = {
    project_id: projectId,
    task_id: taskId,
    work_item_id: null,
    type: 'note',
    content: `Task blocked: ${blockedReason}`,
    created_by: 'agent',
  };

  const { error } = await client
    .from('evidence')
    .insert([evidenceData]);

  if (error) {
    console.error('Error creating blocker evidence:', error);
    // Don't throw - we don't want to block the status update if evidence fails
  }

  // Emit EvidenceAdded event
  await emitEvent({
    project_id: projectId,
    user_id: userId,
    event_type: 'EvidenceAdded',
    payload: {
      task_id: taskId,
      type: 'note',
      content: evidenceData.content,
      created_by: 'agent',
    },
  });
}

