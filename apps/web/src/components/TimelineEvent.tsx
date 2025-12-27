'use client';

import { useState } from 'react';
import type { Event } from '@projectflow/core';

interface TimelineEventProps {
  event: Event;
}

// Event type icons
const eventTypeIcons: Record<string, string> = {
  ProjectCreated: '📁',
  TaskCreated: '➕',
  TaskStarted: '▶️',
  TaskBlocked: '🚫',
  TaskCompleted: '✅',
  TaskCancelled: '❌',
  AgentTaskCreated: '➕',
  AgentTaskStarted: '▶️',
  AgentTaskBlocked: '🚫',
  AgentTaskCompleted: '✅',
  ArtifactProduced: '📦',
  GateEvaluated: '⚡',
  GateExecuted: '⚡',
  GateConfigured: '⚙️',
  CheckpointCreated: '📍',
  DecisionRecorded: '💡',
  OutcomeRecorded: '📊',
  EvidenceAdded: '📄',
  WorkItemCreated: '📋',
  WorkItemStatusChanged: '🔄',
  ScopeAsserted: '🔍',
  ConstraintCreated: '🔒',
  ConstraintDeleted: '🔓',
};

// Event type colors with better semantic meaning
const eventTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  ProjectCreated: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  TaskCreated: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  AgentTaskCreated: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  TaskStarted: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  AgentTaskStarted: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  TaskBlocked: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  AgentTaskBlocked: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  TaskCompleted: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  AgentTaskCompleted: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  TaskCancelled: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
  },
  ArtifactProduced: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  GateEvaluated: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  GateExecuted: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  GateConfigured: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  CheckpointCreated: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
  },
  DecisionRecorded: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
  },
  OutcomeRecorded: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  EvidenceAdded: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  WorkItemCreated: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  WorkItemStatusChanged: {
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  },
  ScopeAsserted: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  ConstraintCreated: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
  },
  ConstraintDeleted: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
  },
};

// Event type labels
const eventTypeLabels: Record<string, string> = {
  ProjectCreated: 'Project Created',
  TaskCreated: 'Task Created',
  TaskStarted: 'Task Started',
  TaskBlocked: 'Task Blocked',
  TaskCompleted: 'Task Completed',
  TaskCancelled: 'Task Cancelled',
  AgentTaskCreated: 'Task Created',
  AgentTaskStarted: 'Task Started',
  AgentTaskBlocked: 'Task Blocked',
  AgentTaskCompleted: 'Task Completed',
  ArtifactProduced: 'Artifact Produced',
  GateEvaluated: 'Gate Evaluated',
  GateExecuted: 'Gate Executed',
  GateConfigured: 'Gate Configured',
  CheckpointCreated: 'Checkpoint Created',
  DecisionRecorded: 'Decision Recorded',
  OutcomeRecorded: 'Outcome Recorded',
  EvidenceAdded: 'Evidence Added',
  WorkItemCreated: 'Work Item Created',
  WorkItemStatusChanged: 'Work Item Status Changed',
  ScopeAsserted: 'Scope Asserted',
  ConstraintCreated: 'Constraint Created',
  ConstraintDeleted: 'Constraint Deleted',
};

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Format event details based on type
function formatEventDetails(event: Event): string | null {
  const { event_type, payload } = event;
  
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const p = payload as Record<string, any>;

  switch (event_type) {
    case 'TaskStarted':
    case 'AgentTaskStarted':
      return p.locked_by ? `Locked by: ${p.locked_by}` : 'Task started';
    
    case 'TaskBlocked':
    case 'AgentTaskBlocked':
      return p.reason ? `Reason: ${p.reason}` : 'Task blocked';
    
    case 'TaskCompleted':
    case 'AgentTaskCompleted':
      return Array.isArray(p.artifacts) && p.artifacts.length > 0
        ? `${p.artifacts.length} artifact(s) produced`
        : 'Task completed';
    
    case 'GateExecuted':
    case 'GateEvaluated':
      const exitCode = typeof p.exit_code === 'number' ? p.exit_code : undefined;
      const status = exitCode === 0 ? 'passing ✅' : 'failing ❌';
      return `Status: ${status}${exitCode !== undefined ? ` (exit code: ${exitCode})` : ''}`;
    
    case 'EvidenceAdded':
      return p.type ? `Type: ${p.type}` : 'Evidence added';
    
    case 'WorkItemStatusChanged':
      return p.status ? `Status: ${p.status}` : 'Status changed';
    
    case 'DecisionRecorded':
      return p.title || 'Decision recorded';
    
    case 'ScopeAsserted':
      const changeset = p.changeset;
      if (changeset && typeof changeset === 'object' && !Array.isArray(changeset)) {
        const filesChanged = Array.isArray(changeset.filesChanged) ? changeset.filesChanged.length : 0;
        const filesAdded = Array.isArray(changeset.filesAdded) ? changeset.filesAdded.length : 0;
        const filesDeleted = Array.isArray(changeset.filesDeleted) ? changeset.filesDeleted.length : 0;
        const total = filesChanged + filesAdded + filesDeleted;
        return `${total} file(s) changed`;
      }
      return p.allowed ? 'Scope allowed' : 'Scope denied';
    
    default:
      return null;
  }
}

export function TimelineEvent({ event }: TimelineEventProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const colors = eventTypeColors[event.event_type] || {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
  };
  
  const icon = eventTypeIcons[event.event_type] || '●';
  const label = eventTypeLabels[event.event_type] || event.event_type;
  const details = formatEventDetails(event);
  const hasPayload = event.payload && typeof event.payload === 'object' && Object.keys(event.payload).length > 0;

  return (
    <div
      className={`relative pl-8 pb-4 border-l-2 ${colors.border} ${colors.bg} rounded-r-lg transition-colors`}
    >
      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center text-xs transform -translate-x-1/2`}
      >
        <span>{icon}</span>
      </div>

      {/* Event content */}
      <div className="ml-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${colors.text} ${colors.bg}`}>
                {label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(event.created_at)}
              </span>
            </div>
            
            {details && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5">
                {details}
              </p>
            )}
          </div>
        </div>

        {/* Expandable payload details */}
        {hasPayload && (
          <details
            className="mt-2"
            open={isExpanded}
            onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
          >
            <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 select-none">
              {isExpanded ? 'Hide' : 'Show'} details
            </summary>
            <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
