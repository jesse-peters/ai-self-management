'use client';

import { useEffect, useState } from 'react';
import type { AgentTaskWithDetails, Evidence } from '@projectflow/core';

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

  useEffect(() => {
    if (isOpen && task.id) {
      loadEvidence();
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

  const statusButtons = [
    { status: 'ready' as const, label: 'Ready', color: 'gray' },
    { status: 'doing' as const, label: 'Doing', color: 'blue' },
    { status: 'blocked' as const, label: 'Blocked', color: 'red' },
    { status: 'review' as const, label: 'Review', color: 'yellow' },
    { status: 'done' as const, label: 'Done', color: 'green' },
  ];

  const evidenceTypeIcons = {
    note: '📝',
    link: '🔗',
    log: '📋',
    diff: '📊',
  };

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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {task.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {task.type.toUpperCase()} • {task.risk.toUpperCase()} RISK • ⏱ {task.timebox_minutes}m
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

          {/* Evidence */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Evidence ({evidence.length})
            </h3>
            
            {isLoadingEvidence ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading evidence...</div>
            ) : evidence.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No evidence yet. Add evidence to document your work.
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {evidence.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {evidenceTypeIcons[item.type as keyof typeof evidenceTypeIcons]} {item.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {item.created_by === 'agent' ? '🤖' : '👤'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Evidence Form */}
            <div className="space-y-2">
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
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingEvidence ? 'Adding...' : 'Add Evidence'}
              </button>
            </div>
          </div>

          {/* Status Change */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Change Status</h3>
            
            {statusError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-700 dark:text-red-400">{statusError}</p>
              </div>
            )}

            {task.status === 'blocked' && blockedReason && (
              <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  Current Blocker:
                </p>
                <p className="text-sm text-yellow-900 dark:text-yellow-200">{task.blocked_reason}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-3">
              {statusButtons.map(({ status, label, color }) => (
                <button
                  key={status}
                  onClick={() => {
                    if (status === 'blocked') {
                      // Show blocked reason input
                      return;
                    }
                    handleStatusChange(status);
                  }}
                  disabled={isChangingStatus || status === task.status}
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                    status === task.status
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed'
                      : `bg-${color}-100 hover:bg-${color}-200 dark:bg-${color}-900/30 dark:hover:bg-${color}-900/50 text-${color}-800 dark:text-${color}-300`
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Blocked Reason Input */}
            <div className="space-y-2">
              <textarea
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Describe the blocker (required to mark as blocked)..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => handleStatusChange('blocked')}
                disabled={isChangingStatus || !blockedReason.trim()}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingStatus ? 'Updating...' : 'Mark as Blocked'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

