'use client';

import { useEffect, useState } from 'react';
import type { Task } from '@projectflow/core';

interface MemoryRecallResult {
  relevantDecisions: Array<{
    decision: {
      id: string;
      title: string;
      choice: string;
      rationale: string;
      created_at: string;
    };
    relevanceScore: number;
    relevanceReason: string;
  }>;
  relevantOutcomes: Array<{
    outcome: {
      id: string;
      subject_type: string;
      result: string;
      notes: string | null;
      root_cause: string | null;
      recommendation: string | null;
      created_at: string;
    };
    relevanceScore: number;
    relevanceReason: string;
  }>;
  recommendedConstraints: Array<{
    constraint: {
      id: string;
      rule_text: string;
      enforcement_level: string;
      scope: string;
      trigger: string;
      created_at: string;
    };
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

interface PriorLearningsProps {
  projectId: string;
  task?: Task;
  query?: string;
  tags?: string[];
  files?: string[];
}

export function PriorLearnings({ projectId, task, query, tags, files }: PriorLearningsProps) {
  const [result, setResult] = useState<MemoryRecallResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const loadMemory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Build query context from task if available
        const recallQuery = query || (task ? `${task.title} ${task.description || ''}` : '');
        const recallTags = tags || [];
        const recallFiles = files || [];

        // If we have a task with constraints, extract file paths
        if (task?.constraints) {
          const constraints = task.constraints as any;
          if (constraints.allowedPaths) {
            recallFiles.push(...constraints.allowedPaths);
          }
        }

        const params = new URLSearchParams({ projectId });
        if (recallQuery) {
          params.append('query', recallQuery);
        }
        if (recallTags.length > 0) {
          params.append('tags', JSON.stringify(recallTags));
        }
        if (recallFiles.length > 0) {
          params.append('files', JSON.stringify(recallFiles));
        }

        const response = await fetch(`/api/memory/recall?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to recall memory');
        }
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to recall memory');
        console.error('Error recalling memory:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemory();
  }, [projectId, task, query, tags, files]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getResultBadge = (result: string) => {
    const styles = {
      worked: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      didnt_work: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      mixed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      unknown: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    };
    const labels = {
      worked: 'Worked',
      didnt_work: "Didn't Work",
      mixed: 'Mixed',
      unknown: 'Unknown',
    };
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded ${styles[result as keyof typeof styles] || styles.unknown}`}>
        {labels[result as keyof typeof labels] || result}
      </span>
    );
  };

  const getEnforcementBadge = (level: string) => {
    const styles = {
      warn: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      block: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded ${styles[level as keyof typeof styles] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
        {level.toUpperCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-blue-700 dark:text-blue-300">Recalling relevant history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const hasLearnings =
    result.relevantDecisions.length > 0 ||
    result.relevantOutcomes.length > 0 ||
    result.recommendedConstraints.length > 0;

  if (!hasLearnings) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No relevant prior learnings found for this context.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
            Prior Learnings Available
          </h3>
          <span className="text-xs text-blue-700 dark:text-blue-400">
            ({result.summary.totalDecisions} decisions, {result.summary.totalOutcomes} outcomes,{' '}
            {result.summary.totalConstraints} constraints)
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-blue-600 dark:text-blue-400 transform transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Relevant Outcomes */}
          {result.relevantOutcomes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2 uppercase">
                Past Outcomes ({result.relevantOutcomes.length})
              </h4>
              <div className="space-y-2">
                {result.relevantOutcomes.map((item) => (
                  <div
                    key={item.outcome.id}
                    className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getResultBadge(item.outcome.result)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(item.outcome.created_at)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {item.relevanceScore}% match
                      </span>
                    </div>
                    {item.outcome.notes && (
                      <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                        {item.outcome.notes}
                      </p>
                    )}
                    {item.outcome.recommendation && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                        💡 {item.outcome.recommendation}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {item.relevanceReason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relevant Decisions */}
          {result.relevantDecisions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2 uppercase">
                Related Decisions ({result.relevantDecisions.length})
              </h4>
              <div className="space-y-2">
                {result.relevantDecisions.map((item) => (
                  <div
                    key={item.decision.id}
                    className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.decision.title}
                      </h5>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {item.relevanceScore}% match
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                      <span className="font-semibold">Chose:</span> {item.decision.choice}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.decision.rationale.length > 150
                        ? item.decision.rationale.slice(0, 150) + '...'
                        : item.decision.rationale}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {item.relevanceReason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Constraints */}
          {result.recommendedConstraints.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2 uppercase">
                Applicable Constraints ({result.recommendedConstraints.length})
              </h4>
              <div className="space-y-2">
                {result.recommendedConstraints.map((item) => (
                  <div
                    key={item.constraint.id}
                    className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getEnforcementBadge(item.constraint.enforcement_level)}
                      </div>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {item.relevanceScore}% match
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {item.constraint.rule_text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {item.relevanceReason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


