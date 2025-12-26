/**
 * Decision service - handles decision record management
 * 
 * Decisions capture key architectural and design choices made during development
 */

import { createServerClient } from '@projectflow/db';
import type { Decision, DecisionInsert } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { getProject } from './projects';
import { emitEvent } from '../events';

/**
 * Records a decision for a project
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param data - Decision data (title, options, choice, rationale)
 * @returns The created decision
 */
export async function recordDecision(
  userId: string,
  projectId: string,
  data: {
    title: string;
    options: any[];
    choice: string;
    rationale: string;
  }
): Promise<Decision> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Validate decision data
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new ValidationError('Decision title is required and must be a non-empty string', 'title');
    }

    if (data.title.length > 500) {
      throw new ValidationError('Decision title must be less than 500 characters', 'title');
    }

    if (!Array.isArray(data.options)) {
      throw new ValidationError('Decision options must be an array', 'options');
    }

    if (data.options.length === 0) {
      throw new ValidationError('Decision must have at least one option', 'options');
    }

    if (!data.choice || typeof data.choice !== 'string' || data.choice.trim().length === 0) {
      throw new ValidationError('Decision choice is required and must be a non-empty string', 'choice');
    }

    if (!data.rationale || typeof data.rationale !== 'string' || data.rationale.trim().length === 0) {
      throw new ValidationError('Decision rationale is required and must be a non-empty string', 'rationale');
    }

    if (data.rationale.length > 5000) {
      throw new ValidationError('Decision rationale must be less than 5000 characters', 'rationale');
    }

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    const { data: decision, error } = await (supabase as any)
      .from('decisions')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          title: data.title.trim(),
          options: data.options,
          choice: data.choice.trim(),
          rationale: data.rationale.trim(),
        },
      ] as any)
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!decision) {
      throw new NotFoundError('Failed to retrieve created decision');
    }

    // Emit DecisionRecorded event
    await emitEvent({
      project_id: projectId,
      user_id: userId,
      event_type: 'DecisionRecorded',
      payload: {
        decision_id: decision.id,
        title: data.title.trim(),
        options: data.options,
        choice: data.choice.trim(),
        rationale: data.rationale.trim(),
      },
    });

    return decision as Decision;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists all decisions for a project, ordered by creation time (newest first)
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param limit - Optional limit on number of decisions to return
 * @returns Array of decisions
 */
export async function listDecisions(
  userId: string,
  projectId: string,
  limit?: number
): Promise<Decision[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    let query = (supabase as any)
      .from('decisions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data: decisions, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (decisions || []) as Decision[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single decision by ID, verifying the user owns it
 * 
 * @param userId - User ID
 * @param decisionId - Decision ID
 * @returns The decision
 */
export async function getDecision(
  userId: string,
  decisionId: string
): Promise<Decision> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(decisionId, 'decisionId');

    const supabase = createServerClient();

    const { data: decision, error } = await (supabase as any)
      .from('decisions')
      .select('*')
      .eq('id', decisionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!decision) {
      throw new NotFoundError('Decision not found');
    }

    return decision as Decision;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

