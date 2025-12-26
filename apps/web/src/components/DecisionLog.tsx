'use client';

import { useEffect, useState } from 'react';
import type { Decision } from '@projectflow/core';

interface DecisionLogProps {
  projectId: string;
  limit?: number;
}

export function DecisionLog({ projectId, limit = 20 }: DecisionLogProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotingDecisionId, setPromotingDecisionId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const loadDecisions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ projectId });
        if (limit) {
          params.append('limit', limit.toString());
        }
        const response = await fetch(`/api/decisions?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load decisions');
        }
        const data = await response.json();
        setDecisions(data.decisions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load decisions');
        console.error('Error loading decisions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDecisions();
  }, [projectId, limit]);

  const handlePromoteToConstraint = async (decision: Decision) => {
    setPromotingDecisionId(decision.id);
    try {
      // Create a constraint based on the decision
      const response = await fetch('/api/constraints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          scope: 'project',
          trigger: 'keyword',
          triggerValue: decision.title,
          ruleText: `Remember decision: ${decision.title} - chose "${decision.choice}". Rationale: ${decision.rationale.substring(0, 200)}${decision.rationale.length > 200 ? '...' : ''}`,
          enforcementLevel: 'warn',
          sourceLinks: [
            {
              type: 'decision',
              id: decision.id,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create constraint');
      }

      alert('Constraint created successfully! You can view it in the Constraints tab.');
    } catch (err) {
      console.error('Error creating constraint:', err);
      alert(err instanceof Error ? err.message : 'Failed to create constraint');
    } finally {
      setPromotingDecisionId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No decisions recorded yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Decisions capture key architectural and design choices
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {decisions.map((decision) => (
        <div
          key={decision.id}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{decision.title}</h4>
              <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(decision.created_at)}</span>
            </div>
            <button
              onClick={() => handlePromoteToConstraint(decision)}
              disabled={promotingDecisionId === decision.id}
              className="ml-4 text-xs px-3 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {promotingDecisionId === decision.id ? 'Creating...' : 'Promote to Constraint'}
            </button>
          </div>

          {Array.isArray(decision.options) && decision.options.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Options considered:</p>
              <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300 space-y-1">
                {decision.options.map((option: any, index: number) => (
                  <li key={index}>
                    {typeof option === 'string' ? option : JSON.stringify(option)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Choice:</p>
            <p className="text-sm text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-block">
              {decision.choice}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Rationale:</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{decision.rationale}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

