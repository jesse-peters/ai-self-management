/**
 * Outcomes service - handles outcome record management
 * 
 * Outcomes track what actually happened after decisions, tasks, gates, and checkpoints,
 * creating the foundation for learning and improvement
 */

import { createServerClient } from '@projectflow/db';
import type { Outcome, OutcomeInsert } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { getProject } from './projects';
import { emitEvent } from '../events';

/**
 * Valid subject types for outcomes
 */
export type OutcomeSubjectType = 'decision' | 'task' | 'gate' | 'checkpoint';

/**
 * Valid result types for outcomes
 */
export type OutcomeResult = 'worked' | 'didnt_work' | 'mixed' | 'unknown';

/**
 * Valid created_by types for outcomes
 */
export type OutcomeCreatedBy = 'agent' | 'human';

/**
 * Records an outcome for a decision, task, gate, or checkpoint
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param data - Outcome data
 * @returns The created outcome
 */
export async function recordOutcome(
  userId: string,
  projectId: string,
  data: {
    subject_type: OutcomeSubjectType;
    subject_id: string;
    result: OutcomeResult;
    evidence_ids?: string[];
    notes?: string;
    root_cause?: string;
    recommendation?: string;
    tags?: string[];
    created_by: OutcomeCreatedBy;
  }
): Promise<Outcome> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');
    validateUUID(data.subject_id, 'subject_id');

    // Validate subject_type
    const validSubjectTypes: OutcomeSubjectType[] = ['decision', 'task', 'gate', 'checkpoint'];
    if (!validSubjectTypes.includes(data.subject_type)) {
      throw new ValidationError(
        `subject_type must be one of: ${validSubjectTypes.join(', ')}`,
        'subject_type'
      );
    }

    // Validate result
    const validResults: OutcomeResult[] = ['worked', 'didnt_work', 'mixed', 'unknown'];
    if (!validResults.includes(data.result)) {
      throw new ValidationError(
        `result must be one of: ${validResults.join(', ')}`,
        'result'
      );
    }

    // Validate created_by
    const validCreatedBy: OutcomeCreatedBy[] = ['agent', 'human'];
    if (!validCreatedBy.includes(data.created_by)) {
      throw new ValidationError(
        `created_by must be one of: ${validCreatedBy.join(', ')}`,
        'created_by'
      );
    }

    // Validate optional fields
    if (data.notes && data.notes.length > 5000) {
      throw new ValidationError('notes must be less than 5000 characters', 'notes');
    }

    if (data.root_cause && data.root_cause.length > 2000) {
      throw new ValidationError('root_cause must be less than 2000 characters', 'root_cause');
    }

    if (data.recommendation && data.recommendation.length > 2000) {
      throw new ValidationError('recommendation must be less than 2000 characters', 'recommendation');
    }

    // Validate evidence_ids if provided
    if (data.evidence_ids) {
      if (!Array.isArray(data.evidence_ids)) {
        throw new ValidationError('evidence_ids must be an array', 'evidence_ids');
      }
      for (const evidenceId of data.evidence_ids) {
        validateUUID(evidenceId, 'evidence_ids item');
      }
    }

    // Validate tags if provided
    if (data.tags) {
      if (!Array.isArray(data.tags)) {
        throw new ValidationError('tags must be an array', 'tags');
      }
    }

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    const { data: outcome, error } = await (supabase as any)
      .from('outcomes')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          subject_type: data.subject_type,
          subject_id: data.subject_id,
          result: data.result,
          evidence_ids: data.evidence_ids || [],
          notes: data.notes?.trim() || null,
          root_cause: data.root_cause?.trim() || null,
          recommendation: data.recommendation?.trim() || null,
          tags: data.tags || [],
          created_by: data.created_by,
        },
      ] as any)
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!outcome) {
      throw new NotFoundError('Failed to retrieve created outcome');
    }

    // Emit OutcomeRecorded event
    await emitEvent({
      project_id: projectId,
      user_id: userId,
      event_type: 'OutcomeRecorded',
      payload: {
        outcome_id: outcome.id,
        subject_type: data.subject_type,
        subject_id: data.subject_id,
        result: data.result,
        created_by: data.created_by,
      },
    });

    return outcome as Outcome;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists outcomes for a project with optional filters
 * 
 * @param userId - User ID (optional, for permission checking)
 * @param projectId - Project ID
 * @param filters - Optional filters
 * @returns Array of outcomes
 */
export async function listOutcomes(
  userId: string,
  projectId: string,
  filters?: {
    subject_type?: OutcomeSubjectType;
    result?: OutcomeResult;
    tags?: string[];
    limit?: number;
  }
): Promise<Outcome[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    let query = (supabase as any)
      .from('outcomes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.subject_type) {
      query = query.eq('subject_type', filters.subject_type);
    }

    if (filters?.result) {
      query = query.eq('result', filters.result);
    }

    if (filters?.tags && filters.tags.length > 0) {
      // Filter for outcomes that contain any of the specified tags
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.limit && filters.limit > 0) {
      query = query.limit(filters.limit);
    }

    const { data: outcomes, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (outcomes || []) as Outcome[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets outcomes for a specific subject (decision, task, gate, or checkpoint)
 * 
 * @param userId - User ID
 * @param subjectType - Type of subject
 * @param subjectId - ID of the subject
 * @returns Array of outcomes for the subject
 */
export async function getOutcomesBySubject(
  userId: string,
  subjectType: OutcomeSubjectType,
  subjectId: string
): Promise<Outcome[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(subjectId, 'subjectId');

    // Validate subject_type
    const validSubjectTypes: OutcomeSubjectType[] = ['decision', 'task', 'gate', 'checkpoint'];
    if (!validSubjectTypes.includes(subjectType)) {
      throw new ValidationError(
        `subjectType must be one of: ${validSubjectTypes.join(', ')}`,
        'subjectType'
      );
    }

    const supabase = createServerClient();

    const { data: outcomes, error } = await (supabase as any)
      .from('outcomes')
      .select('*')
      .eq('subject_type', subjectType)
      .eq('subject_id', subjectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw mapSupabaseError(error);
    }

    return (outcomes || []) as Outcome[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single outcome by ID, verifying the user owns it
 * 
 * @param userId - User ID
 * @param outcomeId - Outcome ID
 * @returns The outcome
 */
export async function getOutcome(
  userId: string,
  outcomeId: string
): Promise<Outcome> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(outcomeId, 'outcomeId');

    const supabase = createServerClient();

    const { data: outcome, error } = await (supabase as any)
      .from('outcomes')
      .select('*')
      .eq('id', outcomeId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!outcome) {
      throw new NotFoundError('Outcome not found');
    }

    return outcome as Outcome;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

