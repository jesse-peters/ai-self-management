'use client';

import { useEffect, useState } from 'react';
import type { Artifact } from '@projectflow/core';

interface ArtifactListProps {
  taskId: string;
}

const artifactTypeColors: Record<string, string> = {
  diff: 'bg-blue-100 text-blue-800',
  pr: 'bg-green-100 text-green-800',
  test_report: 'bg-yellow-100 text-yellow-800',
  document: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800',
};

const artifactTypeLabels: Record<string, string> = {
  diff: 'Code Diff',
  pr: 'Pull Request',
  test_report: 'Test Report',
  document: 'Documentation',
  other: 'Other',
};

export function ArtifactList({ taskId }: ArtifactListProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const loadArtifacts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/artifacts?taskId=${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to load artifacts');
        }
        const data = await response.json();
        setArtifacts(data.artifacts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artifacts');
        console.error('Error loading artifacts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadArtifacts();
  }, [taskId]);

  const groupArtifactsByType = (artifacts: Artifact[]) => {
    const groups: Record<string, Artifact[]> = {};
    artifacts.forEach((artifact) => {
      if (!groups[artifact.type]) {
        groups[artifact.type] = [];
      }
      groups[artifact.type].push(artifact);
    });
    return groups;
  };

  const isUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-20 rounded" />
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

  if (artifacts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">No artifacts for this task</p>
      </div>
    );
  }

  const groupedArtifacts = groupArtifactsByType(artifacts);

  return (
    <div className="space-y-4">
      {Object.entries(groupedArtifacts).map(([type, typeArtifacts]) => (
        <div key={type}>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            {artifactTypeLabels[type] || type} ({typeArtifacts.length})
          </h4>
          <div className="space-y-2">
            {typeArtifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="bg-white p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          artifactTypeColors[type] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {artifactTypeLabels[type] || type}
                      </span>
                    </div>
                    {isUrl(artifact.ref) ? (
                      <a
                        href={artifact.ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                      >
                        {artifact.ref}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-700 break-all font-mono">{artifact.ref}</p>
                    )}
                    {artifact.summary && (
                      <p className="text-xs text-gray-600 mt-1">{artifact.summary}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(artifact.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

