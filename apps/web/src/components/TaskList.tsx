'use client';

import { Task } from '@projectflow/core';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  done: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
};

export function TaskList({ tasks, isLoading = false }: TaskListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks in this project</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{task.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  statusColors[task.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                {task.status.replace('_', ' ').charAt(0).toUpperCase() +
                  task.status.slice(1).replace('_', ' ')}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  (task.priority && priorityColors[task.priority]) || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                {task.priority
                  ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
                  : 'None'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Created {new Date(task.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

