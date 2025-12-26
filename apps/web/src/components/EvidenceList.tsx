'use client';

import type { Evidence } from '@projectflow/core';

interface EvidenceListProps {
  evidence: Evidence[];
  isLoading?: boolean;
}

export function EvidenceList({ evidence, isLoading }: EvidenceListProps) {
  const evidenceTypeIcons = {
    note: '📝',
    link: '🔗',
    log: '📋',
    diff: '📊',
  };

  const evidenceTypeColors = {
    note: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    link: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    log: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    diff: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded" />
        ))}
      </div>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">No evidence recorded yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Evidence provides proof of work completed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {evidence.map((item) => (
        <div
          key={item.id}
          className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  evidenceTypeColors[item.type as keyof typeof evidenceTypeColors]
                }`}
              >
                {evidenceTypeIcons[item.type as keyof typeof evidenceTypeIcons]}{' '}
                {item.type.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.created_by === 'agent' ? '🤖 Agent' : '👤 Human'}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatDate(item.created_at)}
            </span>
          </div>

          <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
            {item.type === 'link' ? (
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {item.content}
              </a>
            ) : (
              item.content
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

