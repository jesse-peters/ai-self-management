'use client';

import { useEffect, useState } from 'react';
import type { Outcome } from '@projectflow/core';

interface OutcomeListProps {
  projectId: string;
  limit?: number;
}

export function OutcomeList({ projectId, limit = 20 }: OutcomeListProps) {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'worked' | 'didnt_work' | 'mixed' | 'unknown'>('all');

  useEffect(() => {
    if (!projectId) return;

    const loadOutcomes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ projectId });
        if (limit) {
          params.append('limit', limit.toString());
        }
        if (filter !== 'all') {
          params.append('result', filter);
        }
        const response = await fetch(`/api/outcomes?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load outcomes');
        }
        const data = await response.json();
        setOutcomes(data.outcomes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load outcomes');
        console.error('Error loading outcomes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOutcomes();
  }, [projectId, limit, filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  const getSubjectTypeBadge = (subjectType: string) => {
    const styles = {
      decision: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      task: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      gate: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      checkpoint: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded ${styles[subjectType as keyof typeof styles] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
        {subjectType.charAt(0).toUpperCase() + subjectType.slice(1)}
      </span>
    );
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

  return (
    <div>
      {/* Filter Bar */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('worked')}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            filter === 'worked'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Worked
        </button>
        <button
          onClick={() => setFilter('didnt_work')}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            filter === 'didnt_work'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Didn't Work
        </button>
        <button
          onClick={() => setFilter('mixed')}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            filter === 'mixed'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Mixed
        </button>
      </div>

      {outcomes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No outcomes recorded yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Outcomes track what actually happened after decisions, tasks, gates, and checkpoints
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {outcomes.map((outcome) => (
            <div
              key={outcome.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getSubjectTypeBadge(outcome.subject_type)}
                    {getResultBadge(outcome.result)}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(outcome.created_at)}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                    by {outcome.created_by}
                  </span>
                </div>
              </div>

              {outcome.notes && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{outcome.notes}</p>
                </div>
              )}

              {outcome.root_cause && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Root Cause:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{outcome.root_cause}</p>
                </div>
              )}

              {outcome.recommendation && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Recommendation:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{outcome.recommendation}</p>
                </div>
              )}

              {outcome.tags && outcome.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {outcome.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

