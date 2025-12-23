/**
 * Checkpoint service - handles checkpoint creation and retrieval
 * 
 * Checkpoints are resumable project snapshots that capture:
 * - Project state (tasks, artifacts, events)
 * - Git reference (commit, branch, tag)
 * - Human-readable summary
 * - Instructions for resuming work
 */

import { createServerClient } from '@projectflow/db';
import type { Checkpoint, CheckpointInsert } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { getProject } from './projects';
import { emitEvent } from '../events';
import { listTasks } from './tasks';
import { getProjectEvents } from '../events';

/**
 * Creates a checkpoint for a project
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param data - Checkpoint data (label, repoRef, summary, resumeInstructions)
 * @returns The created checkpoint
 */
export async function createCheckpoint(
  userId: string,
  projectId: string,
  data: {
    label: string;
    repoRef?: string | null;
    summary: string;
    resumeInstructions?: string | null;
  }
): Promise<Checkpoint> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Validate checkpoint data
    if (!data.label || typeof data.label !== 'string' || data.label.trim().length === 0) {
      throw new ValidationError('Checkpoint label is required and must be a non-empty string', 'label');
    }

    if (data.label.length > 255) {
      throw new ValidationError('Checkpoint label must be less than 255 characters', 'label');
    }

    if (!data.summary || typeof data.summary !== 'string' || data.summary.trim().length === 0) {
      throw new ValidationError('Checkpoint summary is required and must be a non-empty string', 'summary');
    }

    if (data.summary.length > 5000) {
      throw new ValidationError('Checkpoint summary must be less than 5000 characters', 'summary');
    }

    if (data.repoRef !== undefined && data.repoRef !== null) {
      if (typeof data.repoRef !== 'string') {
        throw new ValidationError('Checkpoint repo_ref must be a string', 'repoRef');
      }
      if (data.repoRef.length > 512) {
        throw new ValidationError('Checkpoint repo_ref must be less than 512 characters', 'repoRef');
      }
    }

    if (data.resumeInstructions !== undefined && data.resumeInstructions !== null) {
      if (typeof data.resumeInstructions !== 'string') {
        throw new ValidationError('Checkpoint resume_instructions must be a string', 'resumeInstructions');
      }
      if (data.resumeInstructions.length > 5000) {
        throw new ValidationError('Checkpoint resume_instructions must be less than 5000 characters', 'resumeInstructions');
      }
    }

    // Verify user owns the project
    await getProject(userId, projectId);

    // Build snapshot of current project state
    const tasks = await listTasks(userId, projectId);
    const events = await getProjectEvents(projectId, 100); // Get last 100 events

    const snapshot = {
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: (task as any).priority || null,
        acceptance_criteria: (task as any).acceptance_criteria || [],
        constraints: (task as any).constraints || {},
        dependencies: (task as any).dependencies || [],
        locked_at: (task as any).locked_at || null,
        locked_by: (task as any).locked_by || null,
      })),
      events: events.map((event) => ({
        id: event.id,
        event_type: event.event_type,
        task_id: event.task_id,
        payload: event.payload,
        created_at: event.created_at,
      })),
      created_at: new Date().toISOString(),
    };

    const supabase = createServerClient();

    const { data: checkpoint, error } = await (supabase as any)
      .from('checkpoints')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          label: data.label.trim(),
          repo_ref: data.repoRef?.trim() || null,
          summary: data.summary.trim(),
          resume_instructions: data.resumeInstructions?.trim() || null,
          snapshot: snapshot,
        },
      ] as any)
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!checkpoint) {
      throw new NotFoundError('Failed to retrieve created checkpoint');
    }

    // Emit CheckpointCreated event
    await emitEvent({
      project_id: projectId,
      user_id: userId,
      event_type: 'CheckpointCreated',
      payload: {
        checkpoint_id: checkpoint.id,
        label: data.label.trim(),
        repo_ref: data.repoRef?.trim() || null,
        summary: data.summary.trim(),
        resume_instructions: data.resumeInstructions?.trim() || null,
      },
    });

    return checkpoint as Checkpoint;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single checkpoint by ID, verifying the user owns it
 * 
 * @param userId - User ID
 * @param checkpointId - Checkpoint ID
 * @returns The checkpoint
 */
export async function getCheckpoint(
  userId: string,
  checkpointId: string
): Promise<Checkpoint> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(checkpointId, 'checkpointId');

    const supabase = createServerClient();

    const { data: checkpoint, error } = await (supabase as any)
      .from('checkpoints')
      .select('*')
      .eq('id', checkpointId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!checkpoint) {
      throw new NotFoundError('Checkpoint not found');
    }

    return checkpoint as Checkpoint;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists all checkpoints for a project, ordered by creation time (newest first)
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param limit - Optional limit on number of checkpoints to return
 * @returns Array of checkpoints
 */
export async function listCheckpoints(
  userId: string,
  projectId: string,
  limit?: number
): Promise<Checkpoint[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Verify user owns the project
    await getProject(userId, projectId);

    const supabase = createServerClient();

    let query = (supabase as any)
      .from('checkpoints')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data: checkpoints, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (checkpoints || []) as Checkpoint[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets the latest checkpoint for a project
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns The latest checkpoint, or null if none exist
 */
export async function getLatestCheckpoint(
  userId: string,
  projectId: string
): Promise<Checkpoint | null> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Verify user owns the project
    await getProject(userId, projectId);

    const supabase = createServerClient();

    const { data: checkpoint, error } = await (supabase as any)
      .from('checkpoints')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If not found, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }
      throw mapSupabaseError(error);
    }

    return checkpoint as Checkpoint | null;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

