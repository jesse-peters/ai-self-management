/**
 * Evidence service - handles evidence attachment to tasks and work items
 * 
 * Evidence provides proof of work completed, creating an audit trail and
 * enabling better verification and learning
 */

import { createServerClient } from '@projectflow/db';
import type { Evidence, EvidenceInsert } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { getProject } from './projects';
import { emitEvent } from '../events';

/**
 * Valid evidence types
 */
export type EvidenceType = 'note' | 'link' | 'log' | 'diff';

/**
 * Valid created_by types for evidence
 */
export type EvidenceCreatedBy = 'agent' | 'human';

/**
 * Adds evidence to a task or work item
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param data - Evidence data
 * @returns The created evidence
 */
export async function addEvidence(
  userId: string,
  projectId: string,
  data: {
    task_id?: string;
    work_item_id?: string;
    type: EvidenceType;
    content: string;
    created_by: EvidenceCreatedBy;
  }
): Promise<Evidence> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Validate that at least one of task_id or work_item_id is provided
    if (!data.task_id && !data.work_item_id) {
      throw new ValidationError(
        'Evidence must be attached to either a task_id or work_item_id',
        'task_id/work_item_id'
      );
    }

    // Validate task_id if provided
    if (data.task_id) {
      validateUUID(data.task_id, 'task_id');
    }

    // Validate work_item_id if provided
    if (data.work_item_id) {
      validateUUID(data.work_item_id, 'work_item_id');
    }

    // Validate type
    const validTypes: EvidenceType[] = ['note', 'link', 'log', 'diff'];
    if (!validTypes.includes(data.type)) {
      throw new ValidationError(
        `type must be one of: ${validTypes.join(', ')}`,
        'type'
      );
    }

    // Validate content
    if (!data.content || data.content.trim().length === 0) {
      throw new ValidationError('content is required and cannot be empty', 'content');
    }

    if (data.content.length > 50000) {
      throw new ValidationError('content must be less than 50000 characters', 'content');
    }

    // Validate created_by
    const validCreatedBy: EvidenceCreatedBy[] = ['agent', 'human'];
    if (!validCreatedBy.includes(data.created_by)) {
      throw new ValidationError(
        `created_by must be one of: ${validCreatedBy.join(', ')}`,
        'created_by'
      );
    }

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    // If task_id is provided, verify it belongs to this project
    if (data.task_id) {
      const { data: task, error: taskError } = await (supabase as any)
        .from('agent_tasks')
        .select('id, project_id')
        .eq('id', data.task_id)
        .eq('project_id', projectId)
        .single();

      if (taskError || !task) {
        throw new NotFoundError('Task not found or does not belong to this project');
      }
    }

    // If work_item_id is provided, verify it belongs to this project
    if (data.work_item_id) {
      const { data: workItem, error: workItemError } = await (supabase as any)
        .from('work_items')
        .select('id, project_id')
        .eq('id', data.work_item_id)
        .eq('project_id', projectId)
        .single();

      if (workItemError || !workItem) {
        throw new NotFoundError('Work item not found or does not belong to this project');
      }
    }

    const { data: evidence, error } = await (supabase as any)
      .from('evidence')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          task_id: data.task_id || null,
          work_item_id: data.work_item_id || null,
          type: data.type,
          content: data.content.trim(),
          created_by: data.created_by,
        },
      ] as any)
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!evidence) {
      throw new NotFoundError('Failed to retrieve created evidence');
    }

    // Emit EvidenceAdded event
    await emitEvent({
      project_id: projectId,
      user_id: userId,
      event_type: 'EvidenceAdded',
      payload: {
        evidence_id: evidence.id,
        task_id: data.task_id || null,
        work_item_id: data.work_item_id || null,
        type: data.type,
        created_by: data.created_by,
      },
    });

    return evidence as Evidence;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists evidence for a task or work item
 * 
 * @param userId - User ID
 * @param projectId - Project ID (for permission checking)
 * @param filters - Optional filters
 * @returns Array of evidence
 */
export async function listEvidence(
  userId: string,
  projectId: string,
  filters?: {
    task_id?: string;
    work_item_id?: string;
    type?: EvidenceType;
    created_by?: EvidenceCreatedBy;
    limit?: number;
  }
): Promise<Evidence[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Validate filters
    if (filters?.task_id) {
      validateUUID(filters.task_id, 'task_id');
    }

    if (filters?.work_item_id) {
      validateUUID(filters.work_item_id, 'work_item_id');
    }

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    let query = (supabase as any)
      .from('evidence')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.task_id) {
      query = query.eq('task_id', filters.task_id);
    }

    if (filters?.work_item_id) {
      query = query.eq('work_item_id', filters.work_item_id);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    if (filters?.limit && filters.limit > 0) {
      query = query.limit(filters.limit);
    }

    const { data: evidence, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (evidence || []) as Evidence[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets the count of evidence for a specific task
 * 
 * @param userId - User ID
 * @param taskId - Task ID
 * @returns Count of evidence items
 */
export async function getEvidenceCount(
  userId: string,
  taskId: string
): Promise<number> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(taskId, 'taskId');

    const supabase = createServerClient();

    const { count, error } = await (supabase as any)
      .from('evidence')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('user_id', userId);

    if (error) {
      throw mapSupabaseError(error);
    }

    return count || 0;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single evidence item by ID
 * 
 * @param userId - User ID
 * @param evidenceId - Evidence ID
 * @returns The evidence item
 */
export async function getEvidence(
  userId: string,
  evidenceId: string
): Promise<Evidence> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(evidenceId, 'evidenceId');

    const supabase = createServerClient();

    const { data: evidence, error } = await (supabase as any)
      .from('evidence')
      .select('*')
      .eq('id', evidenceId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!evidence) {
      throw new NotFoundError('Evidence not found');
    }

    return evidence as Evidence;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Deletes evidence
 * 
 * @param userId - User ID
 * @param evidenceId - Evidence ID
 */
export async function deleteEvidence(
  userId: string,
  evidenceId: string
): Promise<void> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(evidenceId, 'evidenceId');

    const supabase = createServerClient();

    // First verify the evidence exists and user owns it
    const evidence = await getEvidence(userId, evidenceId);

    const { error } = await (supabase as any)
      .from('evidence')
      .delete()
      .eq('id', evidenceId)
      .eq('user_id', userId);

    if (error) {
      throw mapSupabaseError(error);
    }

    // Emit EvidenceDeleted event
    await emitEvent({
      project_id: evidence.project_id,
      user_id: userId,
      event_type: 'EvidenceDeleted',
      payload: {
        evidence_id: evidenceId,
        type: evidence.type,
        task_id: evidence.task_id,
        work_item_id: evidence.work_item_id,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

