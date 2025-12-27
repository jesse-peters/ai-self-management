'use client';

import { useEffect, useState } from 'react';
import type { Constraint } from '@projectflow/core';

interface ConstraintListProps {
  projectId: string;
}

export function ConstraintList({ projectId }: ConstraintListProps) {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const loadConstraints = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ projectId });
        const response = await fetch(`/api/constraints?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load constraints');
        }
        const data = await response.json();
        setConstraints(data.constraints || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load constraints');
        console.error('Error loading constraints:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConstraints();
  }, [projectId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEnforcementBadge = (level: string) => {
    if (level === 'block') {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
          Block
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
        Warn
      </span>
    );
  };

  const getScopeBadge = (scope: string) => {
    const colors: Record<string, string> = {
      project: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      repo: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      directory: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      task_type: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    };
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded ${colors[scope] || colors.project}`}>
        {scope}
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

  if (constraints.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No constraints defined yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Constraints turn lessons into enforceable rules that warn or block risky actions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {constraints.map((constraint) => (
        <div
          key={constraint.id}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getEnforcementBadge(constraint.enforcement_level)}
                {getScopeBadge(constraint.scope)}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {constraint.trigger.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-900 dark:text-white font-medium">
                {constraint.rule_text}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{formatDate(constraint.created_at)}</span>
            {constraint.source_links && Array.isArray(constraint.source_links) && constraint.source_links.length > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                {constraint.source_links.length} source{constraint.source_links.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {constraint.scope_value && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Scope value:</span> {constraint.scope_value}
            </div>
          )}

          {constraint.trigger_value && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Trigger value:</span> {constraint.trigger_value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


