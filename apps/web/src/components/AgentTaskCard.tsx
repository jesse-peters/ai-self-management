'use client';

import type { AgentTaskWithDetails } from '@projectflow/core';

interface AgentTaskCardProps {
  task: AgentTaskWithDetails;
  onClick?: () => void;
}

export function AgentTaskCard({ task, onClick }: AgentTaskCardProps) {
  const typeColors = {
    research: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    implement: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    verify: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    docs: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    cleanup: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  const typeLabels = {
    research: '🔍 Research',
    implement: '⚙️ Implement',
    verify: '✓ Verify',
    docs: '📄 Docs',
    cleanup: '🧹 Cleanup',
  };

  const riskColors = {
    low: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-red-600 dark:text-red-400',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-1 rounded ${typeColors[task.type]}`}>
          {typeLabels[task.type]}
        </span>
        <div className="flex items-center gap-2">
          {task.evidence_count > 0 && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              📎 {task.evidence_count}
            </span>
          )}
          {task.verification && (
            <span className="text-xs text-gray-600 dark:text-gray-400" title="Has verification steps">
              ✓
            </span>
          )}
        </div>
      </div>

      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
        {task.title}
      </h4>

      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
        {task.goal}
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${riskColors[task.risk]}`}>
          {task.risk.toUpperCase()} RISK
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          ⏱ {task.timebox_minutes}m
        </span>
      </div>

      {task.blocked_reason && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
          🚫 {task.blocked_reason}
        </div>
      )}
    </div>
  );
}

