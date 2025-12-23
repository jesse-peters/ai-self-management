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
          <div key={i} className="animate-pulse bg-gray-200 h-32 rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">No decisions recorded yet</p>
        <p className="text-gray-400 text-xs mt-1">
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
          className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="mb-3">
            <h4 className="font-semibold text-gray-900 mb-1">{decision.title}</h4>
            <span className="text-xs text-gray-400">{formatDate(decision.created_at)}</span>
          </div>

          {Array.isArray(decision.options) && decision.options.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Options considered:</p>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                {decision.options.map((option: any, index: number) => (
                  <li key={index}>
                    {typeof option === 'string' ? option : JSON.stringify(option)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Choice:</p>
            <p className="text-sm text-gray-900 bg-blue-50 px-2 py-1 rounded inline-block">
              {decision.choice}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Rationale:</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{decision.rationale}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

