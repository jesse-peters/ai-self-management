'use client';

import { useEffect, useState } from 'react';
import type { AgentTaskWithDetails, Evidence, Event, GateStatusSummary } from '@projectflow/core';
import { FileComparisonView } from './FileComparisonView';
import { EvidenceList } from './EvidenceList';
import { GateStatusIndicator } from './GateStatusIndicator';
import { TaskTypeIcon } from './TaskTypeIcon';
import { getTaskTypeClass, TASK_TYPE_LABELS } from '@/lib/colors';
import type { TaskType } from '@/lib/colors';

interface TaskDrawerProps {
  task: AgentTaskWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (status: 'ready' | 'doing' | 'blocked' | 'review' | 'done', blockedReason?: string) => Promise<void>;
  onRefresh?: () => void;
}

export function TaskDrawer({ task, isOpen, onClose, onStatusChange, onRefresh }: TaskDrawerProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [newEvidenceType, setNewEvidenceType] = useState<'note' | 'link' | 'log' | 'diff'>('note');
  const [newEvidenceContent, setNewEvidenceContent] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [gates, setGates] = useState<GateStatusSummary[]>([]);
  const [isLoadingGates, setIsLoadingGates] = useState(false);
  const [runningGate, setRunningGate] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<Event[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  useEffect(() => {
    if (isOpen && task.id) {
      loadEvidence();
      loadGates();
      loadTimeline();
    }
  }, [isOpen, task.id]);

  const loadEvidence = async () => {
    setIsLoadingEvidence(true);
    try {
      const params = new URLSearchParams({
        projectId: task.project_id,
        taskId: task.id,
      });
      const response = await fetch(`/api/evidence?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load evidence');
      const data = await response.json();
      setEvidence(data.evidence || []);
    } catch (error) {
      console.error('Error loading evidence:', error);
    } finally {
      setIsLoadingEvidence(false);
    }
  };

  const loadGates = async () => {
    setIsLoadingGates(true);
    try {
      // Get gates for the project, then filter by task gates if specified
      const params = new URLSearchParams({
        projectId: task.project_id,
        includeStatus: 'true',
      });
      const response = await fetch(`/api/gates?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load gates');
      const data = await response.json();
      const allGates = data.gateStatus || [];
      
      // Filter gates to only show those relevant to this task
      // If task has gates array, filter by that; otherwise show all project gates
      const taskGates = task.gates && Array.isArray(task.gates) ? task.gates : [];
      if (taskGates.length > 0) {
        const gateNames = taskGates.map((g: string) => g.toLowerCase());
        setGates(allGates.filter((g: GateStatusSummary) => 
          gateNames.includes(g.gate_name.toLowerCase())
        ));
      } else {
        // Show all gates if no specific gates are configured for the task
        setGates(allGates);
      }
    } catch (error) {
      console.error('Error loading gates:', error);
      setGates([]);
    } finally {
      setIsLoadingGates(false);
    }
  };

  const loadTimeline = async () => {
    setIsLoadingTimeline(true);
    try {
      const response = await fetch(`/api/events/task/${task.id}?limit=20`);
      if (!response.ok) throw new Error('Failed to load timeline');
      const data = await response.json();
      setTimelineEvents(data.events || []);
    } catch (error) {
      console.error('Error loading timeline:', error);
      setTimelineEvents([]);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  const handleRunGate = async (gateName: string) => {
    setRunningGate(gateName);
    try {
      const response = await fetch('/api/gates/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: task.project_id,
          gateName,
          taskId: task.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run gate');
      }

      // Reload gates and refresh parent
      await loadGates();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error running gate:', error);
      alert(error instanceof Error ? error.message : 'Failed to run gate');
    } finally {
      setRunningGate(null);
    }
  };

  const handleAddEvidence = async () => {
    if (!newEvidenceContent.trim()) return;

    setIsAddingEvidence(true);
    try {
      const response = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: task.project_id,
          taskId: task.id,
          type: newEvidenceType,
          content: newEvidenceContent.trim(),
          created_by: 'human',
        }),
      });

      if (!response.ok) throw new Error('Failed to add evidence');

      setNewEvidenceContent('');
      setNewEvidenceType('note');
      await loadEvidence();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error adding evidence:', error);
      alert(error instanceof Error ? error.message : 'Failed to add evidence');
    } finally {
      setIsAddingEvidence(false);
    }
  };

  const handleStatusChange = async (newStatus: typeof task.status) => {
    setIsChangingStatus(true);
    setStatusError(null);
    try {
      await onStatusChange(newStatus, newStatus === 'blocked' ? blockedReason : undefined);
      if (newStatus !== 'blocked') {
        setBlockedReason('');
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to change status');
    } finally {
      setIsChangingStatus(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {task.task_key && (
                  <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">
                    {task.task_key}
                  </span>
                )}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {task.title}
                </h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <TaskTypeIcon type={task.type as TaskType} size="sm" />
                <span className={`text-xs font-semibold px-2 py-1 rounded ${getTaskTypeClass(task.type as TaskType)}`}>
                  {TASK_TYPE_LABELS[task.type as TaskType]}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {task.risk.toUpperCase()} RISK
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  ⏱ {task.timebox_minutes}m
                </span>
                {task.locked_by && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    🔒 {task.locked_by}
                  </span>
                )}
                {task.status === 'doing' && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    doing
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>

          {/* Goal */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Goal</h3>
            <p className="text-sm text-gray-900 dark:text-white">{task.goal}</p>
          </div>

          {/* Context */}
          {task.context && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Context</h3>
              <p className="text-sm text-gray-700 dark:text-gray-400 whitespace-pre-wrap">{task.context}</p>
            </div>
          )}

          {/* Verification */}
          {task.verification && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                ✓ Verification Steps
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-400 whitespace-pre-wrap">{task.verification}</p>
            </div>
          )}

          {/* File Comparison */}
          <div className="mb-6">
            <FileComparisonView
              expectedFiles={task.expected_files || []}
              touchedFiles={task.touched_files || []}
            />
          </div>

          {/* Gates */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Gates</h3>
            
            {isLoadingGates ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading gates...</div>
            ) : gates.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No gates configured for this task
              </div>
            ) : (
              <div className="space-y-2">
                {gates.map((gate) => {
                  const gateStatus = gate.latest_run?.status || 'not_run';
                  const isPassing = gateStatus === 'passing';
                  const hasRun = !!gate.latest_run;
                  
                  return (
                    <div
                      key={gate.gate_id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GateStatusIndicator
                            status={gateStatus as 'passing' | 'failing' | 'not_run'}
                            gateName={gate.gate_name}
                            size="sm"
                            inline
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {gate.gate_name}
                          </span>
                          {gate.is_required && (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        {gate.runner_mode === 'command' && (
                          <button
                            onClick={() => handleRunGate(gate.gate_name)}
                            disabled={runningGate === gate.gate_name}
                            className="px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {runningGate === gate.gate_name ? 'Running...' : 'Run Gate'}
                          </button>
                        )}
                      </div>
                      {hasRun && gate.latest_run && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <span className={isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {isPassing ? '✓ Passing' : '✗ Failing'}
                            </span>
                            <span>•</span>
                            <span>{new Date(gate.latest_run.created_at).toLocaleString()}</span>
                            {gate.latest_run.exit_code !== null && (
                              <>
                                <span>•</span>
                                <span>Exit code: {gate.latest_run.exit_code}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Evidence */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Evidence ({evidence.length})
            </h3>
            
            <EvidenceList evidence={evidence} isLoading={isLoadingEvidence} />

            {/* Add Evidence Form */}
            <div className="mt-4 space-y-2">
              <select
                value={newEvidenceType}
                onChange={(e) => setNewEvidenceType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="note">Note</option>
                <option value="link">Link</option>
                <option value="log">Log</option>
                <option value="diff">Diff</option>
              </select>
              <textarea
                value={newEvidenceContent}
                onChange={(e) => setNewEvidenceContent(e.target.value)}
                placeholder="Add evidence..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleAddEvidence}
                disabled={isAddingEvidence || !newEvidenceContent.trim()}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAddingEvidence ? 'Adding...' : '+ Add Evidence'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Timeline</h3>
            
            {isLoadingTimeline ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading timeline...</div>
            ) : timelineEvents.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No events yet
              </div>
            ) : (
              <div className="space-y-2">
                {timelineEvents.slice(0, 10).map((event) => {
                  const formatTime = (dateString: string) => {
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
                  };

                  const getEventIcon = (eventType: string) => {
                    if (eventType.includes('Started')) return '▶️';
                    if (eventType.includes('Completed') || eventType.includes('Done')) return '✅';
                    if (eventType.includes('Blocked')) return '🚫';
                    if (eventType.includes('Gate')) return '⚡';
                    if (eventType.includes('Evidence')) return '📄';
                    if (eventType.includes('Created')) return '➕';
                    return '●';
                  };

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-lg">{getEventIcon(event.event_type)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {event.event_type.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        {event.payload && typeof event.payload === 'object' && Object.keys(event.payload).length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {JSON.stringify(event.payload, null, 2).slice(0, 100)}
                            {JSON.stringify(event.payload).length > 100 ? '...' : ''}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatTime(event.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Actions</h3>
            
            {statusError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-700 dark:text-red-400">{statusError}</p>
              </div>
            )}

            {task.status === 'blocked' && task.blocked_reason && (
              <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  Current Blocker:
                </p>
                <p className="text-sm text-yellow-900 dark:text-yellow-200">{task.blocked_reason}</p>
              </div>
            )}

            {/* Status Change Dropdown */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Change Status
              </label>
              <select
                value={task.status}
                onChange={(e) => {
                  const newStatus = e.target.value as typeof task.status;
                  if (newStatus === 'blocked') {
                    // Show blocked reason input
                    return;
                  }
                  handleStatusChange(newStatus);
                }}
                disabled={isChangingStatus}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="ready">Ready</option>
                <option value="doing">Doing</option>
                <option value="blocked">Blocked</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Blocked Reason Input */}
            {(task.status === 'blocked' || blockedReason) && (
              <div className="mb-4 space-y-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Blocker Reason {task.status === 'blocked' && '(required)'}
                </label>
                <textarea
                  value={blockedReason || task.blocked_reason || ''}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="Describe the blocker..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                {task.status !== 'blocked' && (
                  <button
                    onClick={() => handleStatusChange('blocked')}
                    disabled={isChangingStatus || !blockedReason.trim()}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isChangingStatus ? 'Updating...' : 'Mark as Blocked'}
                  </button>
                )}
              </div>
            )}

            {/* Run All Gates Button */}
            {gates.length > 0 && gates.some(g => g.runner_mode === 'command') && (
              <button
                onClick={async () => {
                  const commandGates = gates.filter(g => g.runner_mode === 'command');
                  for (const gate of commandGates) {
                    await handleRunGate(gate.gate_name);
                  }
                }}
                disabled={!!runningGate}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-2"
              >
                {runningGate ? 'Running gates...' : '⚡ Run All Gates'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

