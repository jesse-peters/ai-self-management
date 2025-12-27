'use client';

import type { WorkItemSummary } from '@projectflow/core';
import { GateStatusIndicator } from './GateStatusIndicator';

interface WorkItemStatusBadgeProps {
  workItem: WorkItemSummary;
  compact?: boolean;
  className?: string;
}

/**
 * WorkItemStatusBadge component - displays visual health indicators for a work item
 * Shows gate status, progress, blockers, and evidence count
 * Color-coded for quick scanning (green/yellow/red)
 */
export function WorkItemStatusBadge({ 
  workItem, 
  compact = false,
  className = '' 
}: WorkItemStatusBadgeProps) {
  const { 
    gate_status, 
    done_tasks, 
    total_tasks, 
    blocked_tasks, 
    evidence_count,
    doing_tasks 
  } = workItem;

  // Calculate health status
  const hasBlockers = blocked_tasks > 0;
  const hasFailingGates = gate_status && !gate_status.all_passing && gate_status.required_failing.length > 0;
  const hasMissingEvidence = total_tasks > 0 && evidence_count === 0;
  const progress = total_tasks > 0 ? (done_tasks / total_tasks) * 100 : 0;

  // Determine overall health
  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (hasFailingGates || hasBlockers) {
    healthStatus = 'critical';
  } else if (hasMissingEvidence || progress < 50) {
    healthStatus = 'warning';
  }

  const healthColors = {
    healthy: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const healthTextColors = {
    healthy: 'text-green-800 dark:text-green-300',
    warning: 'text-amber-800 dark:text-amber-300',
    critical: 'text-red-800 dark:text-red-300',
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {/* Gate indicators */}
        {gate_status && (
          <div className="flex items-center gap-1">
            {gate_status.all_passing ? (
              <span className="text-sm" title="All gates passing">⚡</span>
            ) : (
              <span className="text-sm" title={`Failing gates: ${gate_status.required_failing.join(', ')}`}>
                ❌ {gate_status.required_failing.length}
              </span>
            )}
          </div>
        )}

        {/* Progress */}
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {done_tasks}/{total_tasks} tasks
        </span>

        {/* Blockers */}
        {hasBlockers && (
          <span className="text-xs text-red-600 dark:text-red-400" title={`${blocked_tasks} blocked task(s)`}>
            🚫 {blocked_tasks}
          </span>
        )}

        {/* Evidence */}
        {hasMissingEvidence && (
          <span className="text-xs text-amber-600 dark:text-amber-400" title="No evidence attached">
            🚫 0 evidence
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 border ${healthColors[healthStatus]} ${className}`}>
      <div className="space-y-2">
        {/* Header with health indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${healthTextColors[healthStatus]}`}>
              {healthStatus === 'healthy' && '✓ Healthy'}
              {healthStatus === 'warning' && '⚠ Warning'}
              {healthStatus === 'critical' && '🚨 Critical'}
            </span>
          </div>
        </div>

        {/* Gate Status */}
        {gate_status && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Gates:</span>
            {gate_status.all_passing ? (
              <span className="text-sm" title="All gates passing">⚡ All passing</span>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-sm">❌</span>
                <span className="text-xs text-red-700 dark:text-red-400">
                  {gate_status.required_failing.length} failing: {gate_status.required_failing.slice(0, 2).join(', ')}
                  {gate_status.required_failing.length > 2 && '...'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Progress:</span>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {done_tasks}/{total_tasks}
          </span>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-3 text-xs">
          {doing_tasks > 0 && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              {doing_tasks} doing
            </span>
          )}
          {hasBlockers && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {blocked_tasks} blocked
            </span>
          )}
          {evidence_count > 0 ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              ✅ {evidence_count} evidence
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              🚫 No evidence
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * WorkItemStatusBadgeCompact - minimal inline version
 * Shows just the essential indicators in a single line
 */
export function WorkItemStatusBadgeCompact({ 
  workItem, 
  className = '' 
}: Omit<WorkItemStatusBadgeProps, 'compact'>) {
  return <WorkItemStatusBadge workItem={workItem} compact={true} className={className} />;
}

