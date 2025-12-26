'use client';

import { useState } from 'react';
import { Task } from '@projectflow/core';
import { PriorLearnings } from './PriorLearnings';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  projectId?: string;
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

export function TaskList({ tasks, isLoading = false, projectId }: TaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

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
        <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <div className="p-4">
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
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Created {new Date(task.created_at).toLocaleDateString()}
              </p>
              {projectId && (
                <button
                  onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  {expandedTaskId === task.id ? 'Hide' : 'Show'} Prior Learnings
                </button>
              )}
            </div>
          </div>
          {projectId && expandedTaskId === task.id && (
            <div className="px-4 pb-4">
              <PriorLearnings projectId={projectId} task={task} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

