/**
 * Task lifecycle service - handles task locking, dependencies, and lifecycle management
 * 
 * This service implements the task-focused workflow:
 * - pickNextTask: Find and lock the next available task
 * - startTask: Start working on a locked task
 * - blockTask: Mark a task as blocked
 * - completeTask: Complete a task after gates pass and artifacts are attached
 */

import { createServerClient } from '@projectflow/db';
import type { Task } from '@projectflow/db';
import { NotFoundError, UnauthorizedError, ValidationError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { getProject } from './projects';
import { listTasks, getTask } from './tasks';
import { emitEvent } from '../events';
import { evaluateGates } from '../gates/evaluator';
import { listArtifacts } from './artifacts';

/**
 * Task picking strategy
 */
export type TaskPickingStrategy = 'priority' | 'dependencies' | 'oldest' | 'newest';

/**
 * Picks the next available task for a project, considering dependencies and locking
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param strategy - Strategy for picking tasks (default: 'dependencies')
 * @param lockedBy - Identifier for the agent/session that will lock the task
 * @returns The picked and locked task, or null if no tasks available
 */
export async function pickNextTask(
  userId: string,
  projectId: string,
  strategy: TaskPickingStrategy = 'dependencies',
  lockedBy?: string
): Promise<Task | null> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Verify user owns the project
    await getProject(userId, projectId);

    const supabase = createServerClient();

    // Get all tasks for the project
    const allTasks = await listTasks(userId, projectId, { status: 'todo' });

    if (allTasks.length === 0) {
      return null;
    }

    // Filter tasks that are ready (dependencies met)
    const readyTasks = await filterReadyTasks(userId, allTasks);

    if (readyTasks.length === 0) {
      return null;
    }

    // Apply picking strategy
    let selectedTask: Task | null = null;

    switch (strategy) {
      case 'priority': {
        // Sort by priority (high -> medium -> low) then by created_at
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        selectedTask = readyTasks.sort((a, b) => {
          const aPriority = priorityOrder[(a as any).priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[(b as any).priority as keyof typeof priorityOrder] || 0;
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })[0];
        break;
      }

      case 'dependencies': {
        // Prefer tasks with fewer dependencies (already handled by filterReadyTasks)
        // Then sort by created_at (oldest first)
        selectedTask = readyTasks.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0];
        break;
      }

      case 'oldest': {
        selectedTask = readyTasks.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0];
        break;
      }

      case 'newest': {
        selectedTask = readyTasks.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        break;
      }

      default:
        selectedTask = readyTasks[0];
    }

    if (!selectedTask) {
      return null;
    }

    // Lock the task
    const now = new Date().toISOString();
    const { data: lockedTask, error: lockError } = await (supabase as any)
      .from('tasks')
      .update({
        locked_at: now,
        locked_by: lockedBy || null,
      })
      .eq('id', selectedTask.id)
      .eq('user_id', userId)
      .eq('status', 'todo')
      .is('locked_at', null) // Only lock if not already locked
      .select()
      .single();

    if (lockError) {
      throw mapSupabaseError(lockError);
    }

    if (!lockedTask) {
      // Task was already locked by another process, try again
      return pickNextTask(userId, projectId, strategy, lockedBy);
    }

    // Emit TaskPicked event (using TaskStarted event type for now, or we could add TaskPicked)
    await emitEvent({
      project_id: projectId,
      task_id: lockedTask.id,
      user_id: userId,
      event_type: 'TaskStarted',
      payload: {
        task_id: lockedTask.id,
        locked_at: now,
        locked_by: lockedBy || null,
      },
    });

    return lockedTask as Task;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Filters tasks to only those whose dependencies are met
 */
async function filterReadyTasks(userId: string, tasks: Task[]): Promise<Task[]> {
  const readyTasks: Task[] = [];

  for (const task of tasks) {
    const taskData = task as any;
    const dependencies = taskData.dependencies || [];

    if (dependencies.length === 0) {
      // No dependencies, task is ready
      readyTasks.push(task);
      continue;
    }

    // Check if all dependencies are completed
    const supabase = createServerClient();
    const { data: depTasks, error } = await (supabase as any)
      .from('tasks')
      .select('id, status')
      .in('id', dependencies)
      .eq('user_id', userId);

    if (error) {
      // If we can't verify dependencies, skip this task
      continue;
    }

    const allDepsDone = depTasks.every((dep: any) => dep.status === 'done');
    if (allDepsDone) {
      readyTasks.push(task);
    }
  }

  return readyTasks;
}

/**
 * Starts a task that has been picked/locked
 * 
 * @param userId - User ID
 * @param taskId - Task ID to start
 * @returns The started task
 */
export async function startTask(userId: string, taskId: string): Promise<Task> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(taskId, 'taskId');

    const supabase = createServerClient();

    // Get the task and verify it's locked
    const task = await getTask(userId, taskId);
    const taskData = task as any;

    if (task.status !== 'todo' && task.status !== 'in_progress') {
      throw new ValidationError(
        `Task must be in 'todo' or 'in_progress' status to start. Current status: ${task.status}`
      );
    }

    if (!taskData.locked_at) {
      throw new ValidationError('Task must be locked before it can be started');
    }

    // Update task to in_progress
    const { data: updatedTask, error: updateError } = await (supabase as any)
      .from('tasks')
      .update({
        status: 'in_progress',
      })
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

    // Emit TaskStarted event
    await emitEvent({
      project_id: task.project_id,
      task_id: taskId,
      user_id: userId,
      event_type: 'TaskStarted',
      payload: {
        task_id: taskId,
        locked_at: taskData.locked_at || new Date().toISOString(),
        locked_by: taskData.locked_by || null,
      },
    });

    return updatedTask as Task;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Blocks a task with a reason
 * 
 * @param userId - User ID
 * @param taskId - Task ID to block
 * @param reason - Reason for blocking
 * @param needsHuman - Whether human intervention is required
 * @returns The blocked task
 */
export async function blockTask(
  userId: string,
  taskId: string,
  reason: string,
  needsHuman: boolean = false
): Promise<Task> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(taskId, 'taskId');

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Block reason is required');
    }

    const supabase = createServerClient();

    // Get the task to verify ownership
    const task = await getTask(userId, taskId);

    // Update task to blocked status
    const { data: updatedTask, error: updateError } = await (supabase as any)
      .from('tasks')
      .update({
        status: 'blocked',
        locked_at: null, // Release lock when blocked
        locked_by: null,
      })
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

    // Emit TaskBlocked event
    await emitEvent({
      project_id: task.project_id,
      task_id: taskId,
      user_id: userId,
      event_type: 'TaskBlocked',
      payload: {
        task_id: taskId,
        reason: reason.trim(),
        needs_human: needsHuman,
      },
    });

    return updatedTask as Task;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Completes a task after verifying gates pass and artifacts are attached
 * 
 * @param userId - User ID
 * @param taskId - Task ID to complete
 * @param artifactIds - Optional array of artifact IDs to verify (if not provided, checks all artifacts)
 * @returns The completed task
 */
export async function completeTask(
  userId: string,
  taskId: string,
  artifactIds?: string[]
): Promise<Task> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(taskId, 'taskId');

    const supabase = createServerClient();

    // Get the task to verify ownership and status
    const task = await getTask(userId, taskId);

    if (task.status === 'done') {
      throw new ValidationError('Task is already completed');
    }

    if (task.status === 'cancelled') {
      throw new ValidationError('Cannot complete a cancelled task');
    }

    // Evaluate gates
    const gateResults = await evaluateGates(userId, taskId);
    const allGatesPassed = gateResults.every((result) => result.passed);

    if (!allGatesPassed) {
      const failedGates = gateResults.filter((r) => !r.passed);
      const reasons = failedGates.map((r) => r.reason || 'Gate failed').join('; ');
      throw new ValidationError(
        `Cannot complete task: gates did not pass. ${reasons}`
      );
    }

    // Verify artifacts are attached
    const artifacts = await listArtifacts(userId, taskId);
    if (artifactIds && artifactIds.length > 0) {
      // Verify specific artifacts exist
      const artifactIdSet = new Set(artifactIds);
      const foundArtifacts = artifacts.filter((a) => artifactIdSet.has(a.id));
      if (foundArtifacts.length !== artifactIds.length) {
        throw new ValidationError(
          'Some specified artifacts were not found for this task'
        );
      }
    } else if (artifacts.length === 0) {
      throw new ValidationError('Cannot complete task: no artifacts attached');
    }

    // Update task to done status and release lock
    const { data: updatedTask, error: updateError } = await (supabase as any)
      .from('tasks')
      .update({
        status: 'done',
        locked_at: null,
        locked_by: null,
      })
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

    // Emit GateEvaluated event
    await emitEvent({
      project_id: task.project_id,
      task_id: taskId,
      user_id: userId,
      event_type: 'GateEvaluated',
      payload: {
        task_id: taskId,
        gates: gateResults.map((r) => ({
          type: r.gate.type,
          passed: r.passed,
          reason: r.reason,
          missingRequirements: r.missingRequirements,
        })),
      },
    });

    // Emit TaskCompleted event
    await emitEvent({
      project_id: task.project_id,
      task_id: taskId,
      user_id: userId,
      event_type: 'TaskCompleted',
      payload: {
        task_id: taskId,
        artifacts: artifacts.map((a) => a.id),
      },
    });

    return updatedTask as Task;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

