/**
 * Artifact service - handles artifact management for tasks
 * 
 * IMPORTANT: This service now uses RLS for security.
 * All functions accept an authenticated SupabaseClient.
 */

import type { Artifact, Database } from '@projectflow/db';
import { mapSupabaseError, ValidationError } from '../errors';
import { getTask } from './tasks';
import { emitEvent } from '../events';
import type { ArtifactType } from '../types';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Appends an artifact to a task
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID
 * @param data Artifact data (type, ref, summary)
 * @returns The created artifact
 */
export async function appendArtifact(
  client: SupabaseClient<Database>,
  taskId: string,
  data: {
    type: ArtifactType;
    ref: string;
    summary?: string | null;
  }
): Promise<Artifact> {
  try {
    // Validate artifact data
    const validTypes: ArtifactType[] = ['diff', 'pr', 'test_report', 'document', 'other'];
    if (!validTypes.includes(data.type)) {
      throw new ValidationError(
        `Artifact type must be one of: ${validTypes.join(', ')}`,
        'type'
      );
    }

    if (!data.ref || typeof data.ref !== 'string' || data.ref.trim().length === 0) {
      throw new ValidationError('Artifact ref is required and must be a non-empty string', 'ref');
    }

    if (data.ref.length > 2048) {
      throw new ValidationError('Artifact ref must be less than 2048 characters', 'ref');
    }

    if (data.summary !== undefined && data.summary !== null) {
      if (typeof data.summary !== 'string') {
        throw new ValidationError('Artifact summary must be a string', 'summary');
      }
      if (data.summary.length > 2000) {
        throw new ValidationError('Artifact summary must be less than 2000 characters', 'summary');
      }
    }

    // Verify user has access to the task and get task/project info
    const task = await getTask(client, taskId);

    const { data: artifact, error } = await (client as any)
      .from('artifacts')
      .insert([
        {
          task_id: taskId,
          type: data.type,
          ref: data.ref.trim(),
          summary: data.summary?.trim() || null,
        },
      ] as any)
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!artifact) {
      throw new Error('Failed to retrieve created artifact');
    }

    // Get userId for event
    const { data: { user } } = await client.auth.getUser();
    const userId = user?.id;

    // Emit ArtifactProduced event
    if (userId) {
      await emitEvent({
        project_id: task.project_id,
        task_id: taskId,
        user_id: userId,
        event_type: 'ArtifactProduced',
        payload: {
          artifact_id: artifact.id,
          task_id: taskId,
          type: data.type,
          ref: data.ref.trim(),
          summary: data.summary?.trim() || null,
        },
      });
    }

    return artifact as Artifact;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists all artifacts for a task
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param taskId Task ID
 * @returns Array of artifacts
 */
export async function listArtifacts(
  client: SupabaseClient<Database>,
  taskId: string
): Promise<Artifact[]> {
  try {
    // Verify user has access to the task
    await getTask(client, taskId);

    const { data: artifacts, error } = await (client as any)
      .from('artifacts')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      throw mapSupabaseError(error);
    }

    return (artifacts || []) as Artifact[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

