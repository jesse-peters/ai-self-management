'use client';

import type { AgentTaskWithDetails } from '@projectflow/core';
import type { TaskType, TaskStatus } from '@/lib/colors';
import { 
  TASK_TYPE_COLORS, 
  TASK_TYPE_LABELS, 
  getTaskTypeClass 
} from '@/lib/colors';
import { TaskTypeIcon } from './TaskTypeIcon';

interface AgentTaskCardProps {
  task: AgentTaskWithDetails;
  onClick?: () => void;
}

export function AgentTaskCard({ task, onClick }: AgentTaskCardProps) {
  const status = task.status as TaskStatus;
  const taskType = task.type as TaskType;
  const typeColor = TASK_TYPE_COLORS[taskType];
  const isLocked = !!task.locked_by;

  // Status-based styling
  const getStatusStyles = () => {
    switch (status) {
      case 'ready':
        // White background, thin border with type color
        return {
          containerClass: 'bg-white dark:bg-gray-800 border-2',
          containerStyle: {
            borderColor: typeColor.border,
          },
          textColor: 'text-gray-900 dark:text-white',
          opacity: 'opacity-100',
        };
      case 'doing':
        // Solid type color background, white text, pulse animation
        return {
          containerClass: 'border-2 animate-pulse',
          containerStyle: {
            backgroundColor: typeColor.light,
            borderColor: typeColor.light,
          },
          textColor: 'text-white',
          opacity: 'opacity-100',
        };
      case 'blocked':
        // Red left border, warning badge
        return {
          containerClass: 'bg-white dark:bg-gray-800 border-l-4 border-red-500 dark:border-red-400 border-r border-t border-b border-gray-200 dark:border-gray-700',
          containerStyle: {},
          textColor: 'text-gray-900 dark:text-white',
          opacity: 'opacity-100',
        };
      case 'review':
        // Orange left border, review badge
        return {
          containerClass: 'bg-white dark:bg-gray-800 border-l-4 border-amber-500 dark:border-amber-400 border-r border-t border-b border-gray-200 dark:border-gray-700',
          containerStyle: {},
          textColor: 'text-gray-900 dark:text-white',
          opacity: 'opacity-100',
        };
      case 'done':
        // Light gray background, checkmark, lower opacity
        return {
          containerClass: 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600',
          containerStyle: {},
          textColor: 'text-gray-700 dark:text-gray-300',
          opacity: 'opacity-75',
        };
      default:
        return {
          containerClass: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          containerStyle: {},
          textColor: 'text-gray-900 dark:text-white',
          opacity: 'opacity-100',
        };
    }
  };

  const statusStyles = getStatusStyles();

  // Status badge
  const getStatusBadge = () => {
    if (status === 'blocked') {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          🚫 Blocked
        </span>
      );
    }
    if (status === 'review') {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          👀 Review
        </span>
      );
    }
    if (status === 'done') {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          ✅ Done
        </span>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${statusStyles.containerClass}
        p-3 rounded-lg
        hover:shadow-md
        transition-all cursor-pointer
        ${statusStyles.opacity}
      `}
      style={statusStyles.containerStyle}
    >
      {/* Header with task type and status indicators */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <TaskTypeIcon type={taskType} size="sm" />
          <span className={`text-xs font-semibold px-2 py-1 rounded ${getTaskTypeClass(taskType)}`}>
            {TASK_TYPE_LABELS[taskType]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Evidence indicator */}
          {task.evidence_count > 0 ? (
            <span className="text-xs text-green-600 dark:text-green-400" title={`${task.evidence_count} evidence attached`}>
              ✅ {task.evidence_count}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500" title="No evidence">
              🚫
            </span>
          )}
          {/* Lock indicator */}
          {isLocked && (
            <span className="text-xs text-amber-600 dark:text-amber-400" title={`Locked by ${task.locked_by}`}>
              🔒
            </span>
          )}
        </div>
      </div>

      {/* Status badge for blocked/review/done */}
      {getStatusBadge() && (
        <div className="mb-2">
          {getStatusBadge()}
        </div>
      )}

      {/* Task title */}
      <h4 className={`font-medium text-sm mb-1 ${statusStyles.textColor}`}>
        {status === 'done' && (
          <span className="inline-block mr-1.5">✓</span>
        )}
        {task.task_key && (
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 mr-1.5">
            {task.task_key}:
          </span>
        )}
        {task.title}
      </h4>

      {/* Goal/description */}
      <p className={`text-xs mb-2 line-clamp-2 ${statusStyles.textColor} ${status === 'done' ? 'opacity-70' : ''}`}>
        {task.goal}
      </p>

      {/* Footer with risk and timebox */}
      <div className={`flex items-center justify-between text-xs ${statusStyles.textColor} ${status === 'done' ? 'opacity-70' : ''}`}>
        <span className={`font-medium ${
          task.risk === 'low' ? 'text-green-600 dark:text-green-400' :
          task.risk === 'medium' ? 'text-amber-600 dark:text-amber-400' :
          'text-red-600 dark:text-red-400'
        }`}>
          {task.risk.toUpperCase()} RISK
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          ⏱ {task.timebox_minutes}m
        </span>
      </div>

      {/* Blocked reason */}
      {task.blocked_reason && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
          🚫 {task.blocked_reason}
        </div>
      )}
    </div>
  );
}

