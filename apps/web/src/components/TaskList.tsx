'use client';

import { Task } from '@projectflow/core';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export function TaskList({ tasks, isLoading = false }: TaskListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-24 rounded" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No tasks in this project</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  statusColors[task.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {task.status.replace('_', ' ').charAt(0).toUpperCase() +
                  task.status.slice(1).replace('_', ' ')}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  (task.priority && priorityColors[task.priority]) || 'bg-gray-100 text-gray-800'
                }`}
              >
                {task.priority
                  ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
                  : 'None'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Created {new Date(task.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

