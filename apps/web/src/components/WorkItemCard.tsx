'use client';

import type { WorkItemSummary } from '@projectflow/core';
import { useRouter } from 'next/navigation';

interface WorkItemCardProps {
  workItem: WorkItemSummary;
}

export function WorkItemCard({ workItem }: WorkItemCardProps) {
  const router = useRouter();
  const progress = workItem.total_tasks > 0 
    ? (workItem.done_tasks / workItem.total_tasks) * 100 
    : 0;

  const statusColors = {
    open: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };

  const statusLabels = {
    open: 'Open',
    in_progress: 'In Progress',
    done: 'Done',
  };

  const handleCardClick = () => {
    router.push(`/work-items/${workItem.id}`);
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {workItem.title}
          </h3>
          {workItem.external_url && (
            <a
              href={workItem.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View External Link →
            </a>
          )}
        </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              statusColors[workItem.status]
            }`}
          >
            {statusLabels[workItem.status]}
          </span>
        </div>

        {workItem.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {workItem.description}
          </p>
        )}

        <div className="space-y-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {workItem.done_tasks}/{workItem.total_tasks}
            </span>
          </div>

          {/* Task status counts */}
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {workItem.doing_tasks > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {workItem.doing_tasks} doing
              </span>
            )}
            {workItem.blocked_tasks > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {workItem.blocked_tasks} blocked
              </span>
            )}
            {workItem.evidence_count > 0 && (
              <span className="flex items-center gap-1">
                📎 {workItem.evidence_count} evidence
              </span>
            )}
          </div>
        </div>
      </div>
  );
}

