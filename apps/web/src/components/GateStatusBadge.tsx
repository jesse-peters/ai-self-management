'use client';

import type { GateStatusSummary } from '@projectflow/core';

interface GateStatusBadgeProps {
  gateStatus: GateStatusSummary;
  onRun?: () => void;
  isRunning?: boolean;
}

export function GateStatusBadge({ gateStatus, onRun, isRunning }: GateStatusBadgeProps) {
  const isPassing = gateStatus.latest_run?.status === 'passing';
  const hasRun = !!gateStatus.latest_run;

  const statusColor = !hasRun
    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    : isPassing
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';

  const statusIcon = !hasRun ? '⚪' : isPassing ? '✅' : '❌';

  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-xl">{statusIcon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900 dark:text-white">
              {gateStatus.gate_name}
            </span>
            {gateStatus.is_required && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                Required
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor}`}>
              {!hasRun ? 'Not Run' : isPassing ? 'Passing' : 'Failing'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {gateStatus.runner_mode === 'command' ? '⚙️ Automated' : '👤 Manual'}
            </span>
          </div>
        </div>
      </div>

      {onRun && (
        <button
          onClick={onRun}
          disabled={isRunning}
          className="ml-3 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
      )}
    </div>
  );
}

