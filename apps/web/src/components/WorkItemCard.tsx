'use client';

import type { WorkItemSummary } from '@projectflow/core';
import { useRouter } from 'next/navigation';
import { GateStatusIndicator, GateStatusCompact } from './GateStatusIndicator';
import { TaskProgressBar } from './TaskProgressBar';
import { TaskTypeIconRow } from './TaskTypeIcon';
import { DeleteButton } from './DeleteButton';

interface WorkItemCardProps {
  workItem: WorkItemSummary;
  onDeleted?: (workItemId: string) => void;
}

export function WorkItemCard({ workItem, onDeleted }: WorkItemCardProps) {
  const router = useRouter();

  const handleDelete = async () => {
    const response = await fetch(`/api/work-items/${workItem.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete work item');
    }

    if (onDeleted) {
      onDeleted(workItem.id);
    }
  };
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

  // Calculate ready tasks (total - done - doing - blocked)
  const readyTasks = Math.max(0, workItem.total_tasks - workItem.done_tasks - workItem.doing_tasks - workItem.blocked_tasks);

  // Determine gate status for display
  const gateStatus = workItem.gate_status?.all_passing ? 'passing' : 
                     (workItem.gate_status?.required_failing.length ?? 0) > 0 ? 'failing' : 
                     'not_run';

  return (
    <div 
      className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Header with title and status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
            {workItem.title}
          </h3>
          {workItem.external_url && (
            <a
              href={workItem.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View External Link</span>
              <span>→</span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              statusColors[workItem.status]
            }`}
          >
            {statusLabels[workItem.status]}
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteButton
              onDelete={handleDelete}
              entityName="work item"
              entityId={workItem.id}
              size="sm"
              variant="icon"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      {workItem.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {workItem.description}
        </p>
      )}

      {/* Visual Status Indicators */}
      <div className="space-y-3">
        {/* Gate Status Row - Compact inline display */}
        {workItem.gate_status && (
          <div className="flex items-center gap-2 flex-wrap">
            {workItem.gate_status.all_passing ? (
              <>
                <span className="text-sm">⚡</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  All gates passing
                </span>
              </>
            ) : workItem.gate_status.required_failing.length > 0 ? (
              <>
                <span className="text-sm">❌</span>
                <span className="text-xs text-red-600 dark:text-red-400">
                  {workItem.gate_status.required_failing.length} failing
                </span>
              </>
            ) : null}
          </div>
        )}

        {/* Progress Bar with Task Breakdown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Tasks: {workItem.done_tasks}/{workItem.total_tasks}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <TaskProgressBar
            done={workItem.done_tasks}
            doing={workItem.doing_tasks}
            ready={readyTasks}
            blocked={workItem.blocked_tasks}
            total={workItem.total_tasks}
            showLabels={false}
            size="sm"
          />
        </div>

        {/* Quick Status Indicators */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {workItem.doing_tasks > 0 && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              {workItem.doing_tasks} doing
            </span>
          )}
          {workItem.blocked_tasks > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              {workItem.blocked_tasks} blocked
            </span>
          )}
          {workItem.evidence_count > 0 ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span>✅</span>
              {workItem.evidence_count} evidence
            </span>
          ) : workItem.total_tasks > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span>🚫</span>
              No evidence
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

