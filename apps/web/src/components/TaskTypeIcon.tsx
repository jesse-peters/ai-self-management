'use client';

import type { TaskType } from '@/lib/colors';
import { TASK_TYPE_LABELS, getTaskTypeColor } from '@/lib/colors';

interface TaskTypeIconProps {
  type: TaskType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * TaskTypeIcon component - displays a colored dot/badge for a task type
 * Used throughout UI for consistent semantic color coding
 */
export function TaskTypeIcon({ 
  type, 
  size = 'md', 
  showLabel = false,
  className = ''
}: TaskTypeIconProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const color = getTaskTypeColor(type);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Colored dot indicator */}
      <div
        className={`${sizeClasses[size]} rounded-full flex-shrink-0`}
        style={{ backgroundColor: color }}
        title={TASK_TYPE_LABELS[type]}
        aria-label={TASK_TYPE_LABELS[type]}
      />
      
      {/* Optional label */}
      {showLabel && (
        <span className={`font-medium text-gray-700 dark:text-gray-300 ${labelSizeClasses[size]}`}>
          {TASK_TYPE_LABELS[type]}
        </span>
      )}
    </div>
  );
}

/**
 * TaskTypeIconRow component - displays multiple task type icons in a row
 * Useful for showing task type distribution
 */
interface TaskTypeIconRowProps {
  types: TaskType[];
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  className?: string;
}

export function TaskTypeIconRow({ 
  types, 
  size = 'md', 
  maxDisplay = 10,
  className = ''
}: TaskTypeIconRowProps) {
  const displayTypes = types.slice(0, maxDisplay);
  const remaining = types.length - displayTypes.length;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {displayTypes.map((type, index) => (
        <TaskTypeIcon key={`${type}-${index}`} type={type} size={size} />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          +{remaining}
        </span>
      )}
    </div>
  );
}

