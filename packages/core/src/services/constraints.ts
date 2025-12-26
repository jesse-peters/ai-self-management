/**
 * Constraint service - handles constraint management and evaluation
 * 
 * Constraints turn lessons into enforceable rules that warn or block risky actions
 */

import { createServerClient } from '@projectflow/db';
import type { Constraint, ConstraintInsert } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { getProject } from './projects';
import { emitEvent } from '../events';

/**
 * Constraint scope types
 */
export type ConstraintScope = 'project' | 'repo' | 'directory' | 'task_type';

/**
 * Constraint trigger types
 */
export type ConstraintTrigger = 'files_match' | 'task_tag' | 'gate' | 'keyword' | 'always';

/**
 * Constraint enforcement levels
 */
export type ConstraintEnforcement = 'warn' | 'block';

/**
 * Context for evaluating constraints
 */
export interface ConstraintContext {
  files?: string[]; // File paths being changed
  tags?: string[]; // Task tags
  gate?: string; // Gate being evaluated
  keywords?: string[]; // Keywords in description/content
  taskType?: string; // Type of task
  directory?: string; // Directory being modified
}

/**
 * Result of constraint evaluation
 */
export interface ConstraintEvaluationResult {
  violations: Array<{
    constraint: Constraint;
    reason: string;
  }>;
  warnings: Array<{
    constraint: Constraint;
    reason: string;
  }>;
  passed: boolean; // False if any blocking violations exist
}

/**
 * Creates a constraint for a project
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param data - Constraint data
 * @returns The created constraint
 */
export async function createConstraint(
  userId: string,
  projectId: string,
  data: {
    scope: ConstraintScope;
    scopeValue?: string;
    trigger: ConstraintTrigger;
    triggerValue?: string;
    ruleText: string;
    enforcementLevel: ConstraintEnforcement;
    sourceLinks?: Array<{ type: string; id: string }>;
  }
): Promise<Constraint> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Validate constraint data
    if (!data.scope || !['project', 'repo', 'directory', 'task_type'].includes(data.scope)) {
      throw new ValidationError('Invalid constraint scope', 'scope');
    }

    if (!data.trigger || !['files_match', 'task_tag', 'gate', 'keyword', 'always'].includes(data.trigger)) {
      throw new ValidationError('Invalid constraint trigger', 'trigger');
    }

    if (!data.ruleText || typeof data.ruleText !== 'string' || data.ruleText.trim().length === 0) {
      throw new ValidationError('Constraint rule text is required and must be a non-empty string', 'ruleText');
    }

    if (data.ruleText.length > 5000) {
      throw new ValidationError('Constraint rule text must be less than 5000 characters', 'ruleText');
    }

    if (!data.enforcementLevel || !['warn', 'block'].includes(data.enforcementLevel)) {
      throw new ValidationError('Invalid enforcement level', 'enforcementLevel');
    }

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    const { data: constraint, error } = await (supabase as any)
      .from('constraints')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          scope: data.scope,
          scope_value: data.scopeValue || null,
          trigger: data.trigger,
          trigger_value: data.triggerValue || null,
          rule_text: data.ruleText.trim(),
          enforcement_level: data.enforcementLevel,
          source_links: data.sourceLinks || [],
        },
      ] as any)
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!constraint) {
      throw new NotFoundError('Failed to retrieve created constraint');
    }

    // Emit ConstraintCreated event
    await emitEvent({
      project_id: projectId,
      user_id: userId,
      event_type: 'ConstraintCreated',
      payload: {
        constraint_id: constraint.id,
        scope: data.scope,
        trigger: data.trigger,
        enforcement_level: data.enforcementLevel,
        rule_text: data.ruleText.trim(),
      },
    });

    return constraint as Constraint;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists all constraints for a project
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param filters - Optional filters (scope, trigger, enforcementLevel)
 * @returns Array of constraints
 */
export async function listConstraints(
  userId: string,
  projectId: string,
  filters?: {
    scope?: ConstraintScope;
    trigger?: ConstraintTrigger;
    enforcementLevel?: ConstraintEnforcement;
  }
): Promise<Constraint[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    let query = (supabase as any)
      .from('constraints')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.scope) {
      query = query.eq('scope', filters.scope);
    }

    if (filters?.trigger) {
      query = query.eq('trigger', filters.trigger);
    }

    if (filters?.enforcementLevel) {
      query = query.eq('enforcement_level', filters.enforcementLevel);
    }

    const { data: constraints, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (constraints || []) as Constraint[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single constraint by ID
 * 
 * @param userId - User ID
 * @param constraintId - Constraint ID
 * @returns The constraint
 */
export async function getConstraint(
  userId: string,
  constraintId: string
): Promise<Constraint> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(constraintId, 'constraintId');

    const supabase = createServerClient();

    const { data: constraint, error } = await (supabase as any)
      .from('constraints')
      .select('*')
      .eq('id', constraintId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!constraint) {
      throw new NotFoundError('Constraint not found');
    }

    return constraint as Constraint;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Evaluates constraints against a given context
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param context - Context for evaluation (files, tags, gate, keywords, etc.)
 * @returns Evaluation result with violations and warnings
 */
export async function evaluateConstraints(
  userId: string,
  projectId: string,
  context: ConstraintContext
): Promise<ConstraintEvaluationResult> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Get all constraints for the project
    const constraints = await listConstraints(userId, projectId);

    const violations: Array<{ constraint: Constraint; reason: string }> = [];
    const warnings: Array<{ constraint: Constraint; reason: string }> = [];

    for (const constraint of constraints) {
      // Check if constraint is triggered
      const triggered = isConstraintTriggered(constraint, context);

      if (triggered) {
        const reason = buildViolationReason(constraint, context);

        if (constraint.enforcement_level === 'block') {
          violations.push({ constraint, reason });
        } else {
          warnings.push({ constraint, reason });
        }
      }
    }

    const passed = violations.length === 0;

    return {
      violations,
      warnings,
      passed,
    };
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Checks if a constraint is triggered by the given context
 */
function isConstraintTriggered(constraint: Constraint, context: ConstraintContext): boolean {
  // Check scope first
  if (!isScopeMatched(constraint, context)) {
    return false;
  }

  // Check trigger
  switch (constraint.trigger) {
    case 'always':
      return true;

    case 'files_match':
      if (!context.files || context.files.length === 0) {
        return false;
      }
      if (!constraint.trigger_value) {
        return false;
      }
      // Simple pattern matching (could be enhanced with glob patterns)
      const pattern = constraint.trigger_value.toLowerCase();
      return context.files.some(file => file.toLowerCase().includes(pattern));

    case 'task_tag':
      if (!context.tags || context.tags.length === 0) {
        return false;
      }
      if (!constraint.trigger_value) {
        return false;
      }
      return context.tags.some(tag => tag.toLowerCase() === constraint.trigger_value!.toLowerCase());

    case 'gate':
      if (!context.gate) {
        return false;
      }
      if (!constraint.trigger_value) {
        return false;
      }
      return context.gate.toLowerCase() === constraint.trigger_value.toLowerCase();

    case 'keyword':
      if (!context.keywords || context.keywords.length === 0) {
        return false;
      }
      if (!constraint.trigger_value) {
        return false;
      }
      return context.keywords.some(keyword => 
        keyword.toLowerCase().includes(constraint.trigger_value!.toLowerCase())
      );

    default:
      return false;
  }
}

/**
 * Checks if the constraint scope matches the context
 */
function isScopeMatched(constraint: Constraint, context: ConstraintContext): boolean {
  switch (constraint.scope) {
    case 'project':
      // Project-wide constraints always apply
      return true;

    case 'repo':
      // Repo-level constraints apply (could be enhanced with repo detection)
      return true;

    case 'directory':
      if (!constraint.scope_value) {
        return true;
      }
      if (!context.directory && (!context.files || context.files.length === 0)) {
        return false;
      }
      // Check if any file is in the constrained directory
      const dirPattern = constraint.scope_value.toLowerCase();
      if (context.directory && context.directory.toLowerCase().includes(dirPattern)) {
        return true;
      }
      if (context.files) {
        return context.files.some(file => file.toLowerCase().includes(dirPattern));
      }
      return false;

    case 'task_type':
      if (!constraint.scope_value) {
        return true;
      }
      if (!context.taskType) {
        return false;
      }
      return context.taskType.toLowerCase() === constraint.scope_value.toLowerCase();

    default:
      return false;
  }
}

/**
 * Builds a human-readable reason for the violation
 */
function buildViolationReason(constraint: Constraint, context: ConstraintContext): string {
  let reason = constraint.rule_text;

  // Add context-specific details
  if (constraint.trigger === 'files_match' && context.files) {
    const matchedFiles = context.files.filter(file => 
      file.toLowerCase().includes(constraint.trigger_value?.toLowerCase() || '')
    );
    if (matchedFiles.length > 0) {
      reason += ` (Matched files: ${matchedFiles.join(', ')})`;
    }
  }

  if (constraint.trigger === 'task_tag' && context.tags) {
    reason += ` (Task tags: ${context.tags.join(', ')})`;
  }

  if (constraint.trigger === 'gate' && context.gate) {
    reason += ` (Gate: ${context.gate})`;
  }

  if (constraint.scope === 'directory' && constraint.scope_value) {
    reason += ` (Directory: ${constraint.scope_value})`;
  }

  return reason;
}

/**
 * Deletes a constraint
 * 
 * @param userId - User ID
 * @param constraintId - Constraint ID
 */
export async function deleteConstraint(
  userId: string,
  constraintId: string
): Promise<void> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(constraintId, 'constraintId');

    const supabase = createServerClient();

    // First verify the constraint exists and user owns it
    const constraint = await getConstraint(userId, constraintId);

    const { error } = await (supabase as any)
      .from('constraints')
      .delete()
      .eq('id', constraintId)
      .eq('user_id', userId);

    if (error) {
      throw mapSupabaseError(error);
    }

    // Emit ConstraintDeleted event
    await emitEvent({
      project_id: constraint.project_id,
      user_id: userId,
      event_type: 'ConstraintDeleted',
      payload: {
        constraint_id: constraintId,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

