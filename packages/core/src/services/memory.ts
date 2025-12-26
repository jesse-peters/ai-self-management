/**
 * Memory service - handles memory recall at decision points
 * 
 * Provides retrieval of relevant history (decisions, outcomes, constraints)
 * to inform major decisions and prevent repeating past mistakes
 */

import { createServerClient } from '@projectflow/db';
import type { Decision, Outcome, Constraint, WorkItem, AgentTask } from '@projectflow/db';
import { ValidationError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { getProject } from './projects';
import { listDecisions } from './decisions';
import { listOutcomes } from './outcomes';
import { listConstraints } from './constraints';

/**
 * Context for memory recall
 */
export interface MemoryRecallContext {
  query?: string; // Free-text search query
  tags?: string[]; // Tags to match
  files?: string[]; // File paths for relevance matching
  keywords?: string[]; // Keywords to match in content
  since?: string; // ISO timestamp - only recall memories after this time
  until?: string; // ISO timestamp - only recall memories before this time
  limit?: number; // Max results per category (default 10)
}

/**
 * Result of memory recall
 */
export interface MemoryRecallResult {
  relevantDecisions: Array<{
    decision: Decision;
    relevanceScore: number;
    relevanceReason: string;
  }>;
  relevantOutcomes: Array<{
    outcome: Outcome;
    relevanceScore: number;
    relevanceReason: string;
  }>;
  recommendedConstraints: Array<{
    constraint: Constraint;
    relevanceScore: number;
    relevanceReason: string;
  }>;
  relevantWorkItems: Array<{
    workItem: WorkItem;
    relevanceScore: number;
    relevanceReason: string;
  }>;
  relevantAgentTasks: Array<{
    agentTask: AgentTask;
    relevanceScore: number;
    relevanceReason: string;
  }>;
  summary: {
    totalDecisions: number;
    totalOutcomes: number;
    totalConstraints: number;
    totalWorkItems: number;
    totalAgentTasks: number;
    highestRelevanceScore: number;
  };
}

/**
 * Recalls relevant history for a project based on context
 * 
 * Uses text matching, tags, and file path overlap to determine relevance.
 * Returns decisions, outcomes, and constraints sorted by relevance.
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param context - Context for recall (query, tags, files, keywords)
 * @returns Relevant decisions, outcomes, and constraints with relevance scores
 */
export async function recall(
  userId: string,
  projectId: string,
  context: MemoryRecallContext
): Promise<MemoryRecallResult> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Validate context
    if (!context.query && !context.tags && !context.files && !context.keywords) {
      throw new ValidationError(
        'Memory recall requires at least one of: query, tags, files, or keywords',
        'context'
      );
    }

    const supabase = createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    // Fetch all decisions, outcomes, constraints, work items, and agent tasks for the project
    const [decisions, outcomes, constraints, workItems, agentTasks] = await Promise.all([
      listDecisions(userId, projectId),
      listOutcomes(userId, projectId),
      listConstraints(userId, projectId),
      fetchWorkItems(supabase, projectId, userId),
      fetchAgentTasks(supabase, projectId, userId),
    ]);

    // Apply timeline filters if provided
    const since = context.since ? new Date(context.since) : null;
    const until = context.until ? new Date(context.until) : null;
    
    const filteredDecisions = decisions.filter(d => {
      const createdAt = new Date(d.created_at);
      if (since && createdAt < since) return false;
      if (until && createdAt > until) return false;
      return true;
    });

    const filteredOutcomes = outcomes.filter(o => {
      const createdAt = new Date(o.created_at);
      if (since && createdAt < since) return false;
      if (until && createdAt > until) return false;
      return true;
    });

    const filteredConstraints = constraints.filter(c => {
      const createdAt = new Date(c.created_at);
      if (since && createdAt < since) return false;
      if (until && createdAt > until) return false;
      return true;
    });

    const filteredWorkItems = workItems.filter(w => {
      const createdAt = new Date(w.created_at);
      if (since && createdAt < since) return false;
      if (until && createdAt > until) return false;
      return true;
    });

    const filteredAgentTasks = agentTasks.filter(t => {
      const createdAt = new Date(t.created_at);
      if (since && createdAt < since) return false;
      if (until && createdAt > until) return false;
      return true;
    });

    // Build search terms from context
    const searchTerms = buildSearchTerms(context);

    // Determine result limit
    const resultLimit = context.limit || 10;

    // Score and rank decisions
    const relevantDecisions = filteredDecisions
      .map(decision => {
        const { score, reasons } = calculateRelevanceScore(
          {
            title: decision.title,
            text: decision.rationale,
            choice: decision.choice,
            options: Array.isArray(decision.options) ? decision.options : [],
            createdAt: decision.created_at,
          },
          searchTerms,
          context
        );
        return {
          decision,
          relevanceScore: score,
          relevanceReason: reasons.join('; '),
        };
      })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, resultLimit);

    // Score and rank outcomes
    const relevantOutcomes = filteredOutcomes
      .map(outcome => {
        const { score, reasons } = calculateRelevanceScore(
          {
            text: outcome.notes || '',
            rootCause: outcome.root_cause || '',
            recommendation: outcome.recommendation || '',
            tags: outcome.tags ? (Array.isArray(outcome.tags) ? outcome.tags : []) : undefined,
            result: outcome.result,
            createdAt: outcome.created_at,
          },
          searchTerms,
          context
        );
        return {
          outcome,
          relevanceScore: score,
          relevanceReason: reasons.join('; '),
        };
      })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, resultLimit);

    // Score and rank constraints
    const recommendedConstraints = filteredConstraints
      .map(constraint => {
        const { score, reasons } = calculateRelevanceScore(
          {
            text: constraint.rule_text,
            scope: constraint.scope,
            scopeValue: constraint.scope_value,
            trigger: constraint.trigger,
            triggerValue: constraint.trigger_value,
            createdAt: constraint.created_at,
          },
          searchTerms,
          context
        );
        return {
          constraint,
          relevanceScore: score,
          relevanceReason: reasons.join('; '),
        };
      })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, resultLimit);

    // Score and rank work items
    const relevantWorkItems = filteredWorkItems
      .map(workItem => {
        const { score, reasons } = calculateRelevanceScore(
          {
            title: workItem.title,
            text: workItem.description || '',
            externalUrl: workItem.external_url || '',
            createdAt: workItem.created_at,
          },
          searchTerms,
          context
        );
        return {
          workItem,
          relevanceScore: score,
          relevanceReason: reasons.join('; '),
        };
      })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, resultLimit);

    // Score and rank agent tasks
    const relevantAgentTasks = filteredAgentTasks
      .map(agentTask => {
        const { score, reasons } = calculateRelevanceScore(
          {
            title: agentTask.title,
            text: agentTask.goal,
            context: agentTask.context || '',
            verification: agentTask.verification || '',
            taskType: agentTask.type,
            createdAt: agentTask.created_at,
          },
          searchTerms,
          context
        );
        return {
          agentTask,
          relevanceScore: score,
          relevanceReason: reasons.join('; '),
        };
      })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, resultLimit);

    // Calculate summary
    const allScores = [
      ...relevantDecisions.map(d => d.relevanceScore),
      ...relevantOutcomes.map(o => o.relevanceScore),
      ...recommendedConstraints.map(c => c.relevanceScore),
      ...relevantWorkItems.map(w => w.relevanceScore),
      ...relevantAgentTasks.map(t => t.relevanceScore),
    ];
    const highestRelevanceScore = allScores.length > 0 ? Math.max(...allScores) : 0;

    return {
      relevantDecisions,
      relevantOutcomes,
      recommendedConstraints,
      relevantWorkItems,
      relevantAgentTasks,
      summary: {
        totalDecisions: relevantDecisions.length,
        totalOutcomes: relevantOutcomes.length,
        totalConstraints: recommendedConstraints.length,
        totalWorkItems: relevantWorkItems.length,
        totalAgentTasks: relevantAgentTasks.length,
        highestRelevanceScore,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Fetches work items for a project
 */
async function fetchWorkItems(
  supabase: any,
  projectId: string,
  userId: string
): Promise<WorkItem[]> {
  const { data: workItems, error } = await supabase
    .from('work_items')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    // If table doesn't exist yet, return empty array
    if (error.code === '42P01') {
      return [];
    }
    throw mapSupabaseError(error);
  }

  return (workItems || []) as WorkItem[];
}

/**
 * Fetches agent tasks for a project
 */
async function fetchAgentTasks(
  supabase: any,
  projectId: string,
  userId: string
): Promise<AgentTask[]> {
  const { data: agentTasks, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    // If table doesn't exist yet, return empty array
    if (error.code === '42P01') {
      return [];
    }
    throw mapSupabaseError(error);
  }

  return (agentTasks || []) as AgentTask[];
}

/**
 * Builds normalized search terms from context
 */
function buildSearchTerms(context: MemoryRecallContext): string[] {
  const terms: string[] = [];

  if (context.query) {
    terms.push(...context.query.toLowerCase().split(/\s+/));
  }

  if (context.keywords) {
    terms.push(...context.keywords.map(k => k.toLowerCase()));
  }

  if (context.tags) {
    terms.push(...context.tags.map(t => t.toLowerCase()));
  }

  // Remove duplicates and empty strings
  return [...new Set(terms)].filter(t => t.length > 0);
}

/**
 * Calculates relevance score for an item
 * 
 * Returns score (0-100) and reasons for the score
 * Improved scoring includes recency boost and better weighting
 */
function calculateRelevanceScore(
  item: {
    title?: string;
    text?: string;
    choice?: string;
    options?: any[];
    rootCause?: string;
    recommendation?: string;
    tags?: string[];
    result?: string;
    scope?: string;
    scopeValue?: string | null;
    trigger?: string;
    triggerValue?: string | null;
    context?: string;
    verification?: string;
    externalUrl?: string;
    taskType?: string;
    createdAt?: string; // For recency boost
  },
  searchTerms: string[],
  context: MemoryRecallContext
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Normalize all text fields
  const textFields = [
    item.title || '',
    item.text || '',
    item.choice || '',
    item.rootCause || '',
    item.recommendation || '',
    item.scopeValue || '',
    item.triggerValue || '',
    item.context || '',
    item.verification || '',
    item.externalUrl || '',
    item.taskType || '',
    ...(item.options || []).map(o => typeof o === 'string' ? o : JSON.stringify(o)),
  ].map(t => t.toLowerCase());

  const allText = textFields.join(' ');

  // Text matching (40 points max)
  if (searchTerms.length > 0) {
    const matchedTerms = searchTerms.filter(term => allText.includes(term));
    if (matchedTerms.length > 0) {
      const textScore = Math.min(40, (matchedTerms.length / searchTerms.length) * 40);
      score += textScore;
      reasons.push(`Matched ${matchedTerms.length}/${searchTerms.length} search terms`);
    }
  }

  // Tag overlap (25 points max)
  if (context.tags && context.tags.length > 0 && item.tags && item.tags.length > 0) {
    const contextTagsLower = context.tags.map(t => t.toLowerCase());
    const itemTagsLower = item.tags.map(t => t.toLowerCase());
    const matchedTags = contextTagsLower.filter(tag => itemTagsLower.includes(tag));
    if (matchedTags.length > 0) {
      const tagScore = Math.min(25, (matchedTags.length / contextTagsLower.length) * 25);
      score += tagScore;
      reasons.push(`Matched ${matchedTags.length}/${contextTagsLower.length} tags`);
    }
  }

  // File path overlap (25 points max)
  if (context.files && context.files.length > 0) {
    const contextFilePaths = context.files.map(f => f.toLowerCase());
    
    // Check if any file paths are mentioned in the text
    const mentionedFiles = contextFilePaths.filter(filePath => {
      // Extract file name and directory components
      const parts = filePath.split('/').filter(p => p.length > 0);
      return parts.some(part => allText.includes(part));
    });

    if (mentionedFiles.length > 0) {
      const fileScore = Math.min(25, (mentionedFiles.length / contextFilePaths.length) * 25);
      score += fileScore;
      reasons.push(`Mentioned ${mentionedFiles.length}/${contextFilePaths.length} relevant file paths`);
    }
  }

  // Recency boost (up to 10 points) - more recent memories are more relevant
  if (item.createdAt) {
    const createdAt = new Date(item.createdAt);
    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Full 10 points for < 1 day old, linear decay to 0 at 30 days
    const recencyScore = Math.max(0, Math.min(10, 10 * (1 - ageInDays / 30)));
    if (recencyScore > 0) {
      score += recencyScore;
      const daysAgo = Math.floor(ageInDays);
      reasons.push(`Recent (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`);
    }
  }

  // Boost for negative outcomes (extra 15 points) - these are especially important to recall
  if (item.result === 'didnt_work') {
    score += 15;
    reasons.push('Previous failure - critical to avoid repeating');
  } else if (item.result === 'mixed') {
    score += 10;
    reasons.push('Mixed result - learn from experience');
  }

  // Boost for blocking constraints (extra 15 points)
  if (item.scope === 'block') {
    score += 15;
    reasons.push('Blocking constraint - critical to be aware of');
  }

  return { score: Math.round(score), reasons };
}

