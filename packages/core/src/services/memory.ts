/**
 * Memory service - handles memory recall at decision points
 * 
 * Provides retrieval of relevant history (decisions, outcomes, constraints)
 * to inform major decisions and prevent repeating past mistakes
 */

import { createServerClient } from '@projectflow/db';
import type { Decision, Outcome, Constraint } from '@projectflow/db';
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
  summary: {
    totalDecisions: number;
    totalOutcomes: number;
    totalConstraints: number;
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

    // Fetch all decisions, outcomes, and constraints for the project
    const [decisions, outcomes, constraints] = await Promise.all([
      listDecisions(userId, projectId),
      listOutcomes(userId, projectId),
      listConstraints(userId, projectId),
    ]);

    // Build search terms from context
    const searchTerms = buildSearchTerms(context);

    // Score and rank decisions
    const relevantDecisions = decisions
      .map(decision => {
        const { score, reasons } = calculateRelevanceScore(
          {
            title: decision.title,
            text: decision.rationale,
            choice: decision.choice,
            options: Array.isArray(decision.options) ? decision.options : [],
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
      .slice(0, 10); // Top 10 most relevant

    // Score and rank outcomes
    const relevantOutcomes = outcomes
      .map(outcome => {
        const { score, reasons } = calculateRelevanceScore(
          {
            text: outcome.notes || '',
            rootCause: outcome.root_cause || '',
            recommendation: outcome.recommendation || '',
            tags: outcome.tags ? (Array.isArray(outcome.tags) ? outcome.tags : []) : undefined,
            result: outcome.result,
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
      .slice(0, 10); // Top 10 most relevant

    // Score and rank constraints
    const recommendedConstraints = constraints
      .map(constraint => {
        const { score, reasons } = calculateRelevanceScore(
          {
            text: constraint.rule_text,
            scope: constraint.scope,
            scopeValue: constraint.scope_value,
            trigger: constraint.trigger,
            triggerValue: constraint.trigger_value,
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
      .slice(0, 10); // Top 10 most relevant

    // Calculate summary
    const allScores = [
      ...relevantDecisions.map(d => d.relevanceScore),
      ...relevantOutcomes.map(o => o.relevanceScore),
      ...recommendedConstraints.map(c => c.relevanceScore),
    ];
    const highestRelevanceScore = allScores.length > 0 ? Math.max(...allScores) : 0;

    return {
      relevantDecisions,
      relevantOutcomes,
      recommendedConstraints,
      summary: {
        totalDecisions: relevantDecisions.length,
        totalOutcomes: relevantOutcomes.length,
        totalConstraints: recommendedConstraints.length,
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

  // Tag overlap (30 points max)
  if (context.tags && context.tags.length > 0 && item.tags && item.tags.length > 0) {
    const contextTagsLower = context.tags.map(t => t.toLowerCase());
    const itemTagsLower = item.tags.map(t => t.toLowerCase());
    const matchedTags = contextTagsLower.filter(tag => itemTagsLower.includes(tag));
    if (matchedTags.length > 0) {
      const tagScore = Math.min(30, (matchedTags.length / contextTagsLower.length) * 30);
      score += tagScore;
      reasons.push(`Matched ${matchedTags.length}/${contextTagsLower.length} tags`);
    }
  }

  // File path overlap (30 points max)
  if (context.files && context.files.length > 0) {
    const contextFilePaths = context.files.map(f => f.toLowerCase());
    
    // Check if any file paths are mentioned in the text
    const mentionedFiles = contextFilePaths.filter(filePath => {
      // Extract file name and directory components
      const parts = filePath.split('/').filter(p => p.length > 0);
      return parts.some(part => allText.includes(part));
    });

    if (mentionedFiles.length > 0) {
      const fileScore = Math.min(30, (mentionedFiles.length / contextFilePaths.length) * 30);
      score += fileScore;
      reasons.push(`Mentioned ${mentionedFiles.length}/${contextFilePaths.length} relevant file paths`);
    }
  }

  // Boost for negative outcomes (extra 10 points) - these are especially important to recall
  if (item.result === 'didnt_work' || item.result === 'mixed') {
    score += 10;
    reasons.push('Previous issue or mixed result - important to avoid repeating');
  }

  // Boost for blocking constraints (extra 10 points)
  if (item.scope === 'block') {
    score += 10;
    reasons.push('Blocking constraint - critical to be aware of');
  }

  return { score: Math.round(score), reasons };
}

