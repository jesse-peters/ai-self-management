'use client';

import type { TaskType } from '@/lib/colors';
import { TASK_TYPE_COLORS, TASK_TYPE_LABELS } from '@/lib/colors';

interface TaskProgressProps {
  done: number;
  doing: number;
  ready: number;
  blocked?: number;
  total?: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface TaskProgressWithTypeProps {
  completed: { count: number; type: TaskType }[];
  inProgress: { count: number; type: TaskType }[];
  ready: { count: number; type: TaskType }[];
  blocked?: { count: number; type: TaskType }[];
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * TaskProgressBar component - displays task progress with color-coded segments
 * Shows done, doing, ready, and blocked tasks
 */
export function TaskProgressBar({
  done,
  doing,
  ready,
  blocked = 0,
  total,
  showLabels = true,
  size = 'md',
  className = '',
}: TaskProgressProps) {
  const calculatedTotal = total ?? done + doing + ready + blocked;
  
  if (calculatedTotal === 0) {
    return (
      <div className={className}>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" />
        {showLabels && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            No tasks
          </div>
        )}
      </div>
    );
  }

  const donePercent = (done / calculatedTotal) * 100;
  const doingPercent = (doing / calculatedTotal) * 100;
  const readyPercent = (ready / calculatedTotal) * 100;
  const blockedPercent = (blocked / calculatedTotal) * 100;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={className}>
      <div className={`flex gap-0.5 ${heightClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        {/* Done segment - Green */}
        {donePercent > 0 && (
          <div
            className="bg-green-500 dark:bg-green-400 transition-all"
            style={{ width: `${donePercent}%` }}
            title={`Done: ${done}`}
          />
        )}
        
        {/* Doing segment - Blue */}
        {doingPercent > 0 && (
          <div
            className="bg-blue-500 dark:bg-blue-400 transition-all animate-pulse"
            style={{ width: `${doingPercent}%` }}
            title={`In Progress: ${doing}`}
          />
        )}
        
        {/* Ready segment - Gray */}
        {readyPercent > 0 && (
          <div
            className="bg-gray-400 dark:bg-gray-500 transition-all"
            style={{ width: `${readyPercent}%` }}
            title={`Ready: ${ready}`}
          />
        )}
        
        {/* Blocked segment - Red */}
        {blockedPercent > 0 && (
          <div
            className="bg-red-500 dark:bg-red-400 transition-all"
            style={{ width: `${blockedPercent}%` }}
            title={`Blocked: ${blocked}`}
          />
        )}
      </div>
      
      {showLabels && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              Done: {done}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
              Doing: {doing}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
              Ready: {ready}
            </span>
            {blocked > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                Blocked: {blocked}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * TaskProgressByType component - displays progress segmented by task type
 * Each segment is colored according to task type
 */
export function TaskProgressByType({
  completed,
  inProgress,
  ready,
  blocked = [],
  showLabels = true,
  size = 'md',
  className = '',
}: TaskProgressWithTypeProps) {
  const total = completed.reduce((sum, t) => sum + t.count, 0) +
    inProgress.reduce((sum, t) => sum + t.count, 0) +
    ready.reduce((sum, t) => sum + t.count, 0) +
    blocked.reduce((sum, t) => sum + t.count, 0);

  if (total === 0) {
    return (
      <div className={className}>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" />
        {showLabels && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            No tasks
          </div>
        )}
      </div>
    );
  }

  // Flatten all segments with their properties
  const segments: Array<{
    type: TaskType;
    status: 'completed' | 'inProgress' | 'ready' | 'blocked';
    count: number;
  }> = [
    ...completed.map((t) => ({ ...t, status: 'completed' as const })),
    ...inProgress.map((t) => ({ ...t, status: 'inProgress' as const })),
    ...ready.map((t) => ({ ...t, status: 'ready' as const })),
    ...blocked.map((t) => ({ ...t, status: 'blocked' as const })),
  ];

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const statusOpacities = {
    completed: 'opacity-100',
    inProgress: 'opacity-100 animate-pulse',
    ready: 'opacity-75',
    blocked: 'opacity-60',
  };

  return (
    <div className={className}>
      <div className={`flex gap-0.5 ${heightClasses[size]} rounded-full overflow-hidden`}>
        {segments.map((segment, index) => {
          const color = TASK_TYPE_COLORS[segment.type];
          const percent = (segment.count / total) * 100;
          const opacity = statusOpacities[segment.status];

          return (
            <div
              key={`${segment.type}-${segment.status}-${index}`}
              className={opacity}
              style={{
                width: `${percent}%`,
                backgroundColor: color.light,
                transition: 'all 0.3s ease-out',
              }}
              title={`${TASK_TYPE_LABELS[segment.type]} (${segment.status}): ${segment.count}`}
            />
          );
        })}
      </div>

      {showLabels && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          <div className="flex flex-wrap gap-4">
            {Array.from(new Set(completed.map((t) => t.type))).map((type) => {
              const count = completed.find((t) => t.type === type)?.count ?? 0;
              return (
                <span key={`completed-${type}`} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: TASK_TYPE_COLORS[type].light }}
                  />
                  {TASK_TYPE_LABELS[type]}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SimpleProgressBar component - minimal progress bar for embedded display
 * Just shows overall progress without breakdown
 */
interface SimpleProgressBarProps {
  current: number;
  total: number;
  color?: 'blue' | 'green' | 'purple' | 'amber';
  showText?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function SimpleProgressBar({
  current,
  total,
  color = 'blue',
  showText = false,
  size = 'sm',
  className = '',
}: SimpleProgressBarProps) {
  const percent = total === 0 ? 0 : (current / total) * 100;

  const colorClasses = {
    blue: 'bg-blue-500 dark:bg-blue-400',
    green: 'bg-green-500 dark:bg-green-400',
    purple: 'bg-purple-500 dark:bg-purple-400',
    amber: 'bg-amber-500 dark:bg-amber-400',
  };

  const heightClasses = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
  };

  return (
    <div className={className}>
      <div className={`${heightClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`${colorClasses[color]} h-full transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showText && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {current} / {total}
        </div>
      )}
    </div>
  );
}

