'use client';

import { useEffect, useState } from 'react';
import type { Checkpoint } from '@projectflow/core';

interface CheckpointListProps {
  projectId: string;
  limit?: number;
}

export function CheckpointList({ projectId, limit = 10 }: CheckpointListProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const loadCheckpoints = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ projectId });
        if (limit) {
          params.append('limit', limit.toString());
        }
        const response = await fetch(`/api/checkpoints?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load checkpoints');
        }
        const data = await response.json();
        setCheckpoints(data.checkpoints || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load checkpoints');
        console.error('Error loading checkpoints:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCheckpoints();
  }, [projectId, limit]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded" />
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

  if (checkpoints.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No checkpoints yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Checkpoints capture project state snapshots for resuming work
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checkpoints.map((checkpoint) => (
        <div
          key={checkpoint.id}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{checkpoint.label}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{checkpoint.summary}</p>
              {checkpoint.repo_ref && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">
                  Git: {checkpoint.repo_ref}
                </p>
              )}
              {checkpoint.resume_instructions && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                    Resume instructions
                  </summary>
                  <p className="mt-2 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded whitespace-pre-wrap">
                    {checkpoint.resume_instructions}
                  </p>
                </details>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(checkpoint.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

