'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkItemSummary, AgentTaskWithDetails, GateStatusSummary, Outcome } from '@projectflow/core';
import { AgentTaskCard } from '@/components/AgentTaskCard';
import { TaskDrawer } from '@/components/TaskDrawer';
import { GateStatusBadge } from '@/components/GateStatusBadge';
import { OutcomeForm } from '@/components/OutcomeForm';
import { OutcomeList } from '@/components/OutcomeList';

export default function WorkItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const workItemId = params.id as string;

  const [workItem, setWorkItem] = useState<WorkItemSummary | null>(null);
  const [tasks, setTasks] = useState<AgentTaskWithDetails[]>([]);
  const [gateStatus, setGateStatus] = useState<GateStatusSummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTaskWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningGate, setRunningGate] = useState<string | null>(null);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const loadWorkItem = useCallback(async () => {
    if (!workItemId) return;

    try {
      const response = await fetch(`/api/work-items/${workItemId}`);
      if (!response.ok) throw new Error('Failed to load work item');
      const data = await response.json();
      setWorkItem(data.workItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work item');
      console.error('Error loading work item:', err);
    }
  }, [workItemId]);

  const loadTasks = useCallback(async () => {
    if (!workItem) return;

    try {
      const params = new URLSearchParams({
        projectId: workItem.project_id,
        workItemId: workItemId,
      });
      const response = await fetch(`/api/agent-tasks?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  }, [workItem, workItemId]);

  const loadGateStatus = useCallback(async () => {
    if (!workItem) return;

    try {
      const params = new URLSearchParams({
        projectId: workItem.project_id,
        workItemId: workItemId,
        includeStatus: 'true',
      });
      const response = await fetch(`/api/gates?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load gate status');
      const data = await response.json();
      setGateStatus(data.gateStatus || []);
    } catch (err) {
      console.error('Error loading gate status:', err);
    }
  }, [workItem, workItemId]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await loadWorkItem();
  }, [loadWorkItem]);

  useEffect(() => {
    if (user && workItemId) {
      loadAll();
    }
  }, [user, workItemId, loadAll]);

  useEffect(() => {
    if (workItem) {
      loadTasks();
      loadGateStatus();
    }
  }, [workItem, loadTasks, loadGateStatus]);

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'done') => {
    if (!workItem) return;

    try {
      const response = await fetch(`/api/work-items/${workItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      await loadWorkItem();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleTaskStatusChange = async (
    taskId: string,
    newStatus: 'ready' | 'doing' | 'blocked' | 'review' | 'done',
    blockedReason?: string
  ) => {
    try {
      const body: any = { status: newStatus };
      if (newStatus === 'blocked' && blockedReason) {
        body.blocked_reason = blockedReason;
      }

      const response = await fetch(`/api/agent-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update task status');
      }

      await loadTasks();
      await loadWorkItem();
      setSelectedTask(null);
    } catch (err) {
      throw err; // Re-throw to be handled by TaskDrawer
    }
  };

  const handleRunGate = async (gateName: string) => {
    if (!workItem) return;

    setRunningGate(gateName);
    try {
      const response = await fetch('/api/gates/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: workItem.project_id,
          gateName,
          workItemId: workItemId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run gate');
      }

      await loadGateStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to run gate');
    } finally {
      setRunningGate(null);
    }
  };

  const tasksByStatus = {
    ready: tasks.filter((t) => t.status === 'ready'),
    doing: tasks.filter((t) => t.status === 'doing'),
    blocked: tasks.filter((t) => t.status === 'blocked'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user || !workItem) {
    return null;
  }

  const statusColors = {
    open: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/work-items?projectId=${workItem.project_id}`)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            ← Back to Work Items
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {workItem.title}
              </h1>
              {workItem.external_url && (
                <a
                  href={workItem.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View External Link →
                </a>
              )}
              {workItem.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  {workItem.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold px-3 py-1 rounded ${statusColors[workItem.status]}`}>
                {workItem.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
              <select
                value={workItem.status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress: {workItem.done_tasks}/{workItem.total_tasks} tasks complete
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {workItem.total_tasks > 0 ? Math.round((workItem.done_tasks / workItem.total_tasks) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-500 dark:bg-blue-400 h-3 rounded-full transition-all"
                style={{
                  width: `${workItem.total_tasks > 0 ? (workItem.done_tasks / workItem.total_tasks) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Task Kanban - 2 columns */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Task Queue</h2>
            
            <div className="grid grid-cols-5 gap-4">
              {(['ready', 'doing', 'blocked', 'review', 'done'] as const).map((status) => (
                <div key={status} className="flex flex-col">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {tasksByStatus[status].length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {tasksByStatus[status].map((task) => (
                      <AgentTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                    {tasksByStatus[status].length === 0 && (
                      <div className="text-center py-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Gate Status */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Gates</h2>
              {gateStatus.length === 0 ? (
                <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No gates configured</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gateStatus.map((gate) => (
                    <GateStatusBadge
                      key={gate.gate_id}
                      gateStatus={gate}
                      onRun={() => handleRunGate(gate.gate_name)}
                      isRunning={runningGate === gate.gate_name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Retro / Outcomes */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Retrospective</h2>
              
              {!showOutcomeForm ? (
                <button
                  onClick={() => setShowOutcomeForm(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
                >
                  + Record Learning
                </button>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <OutcomeForm
                    projectId={workItem.project_id}
                    subjectType="work_item"
                    subjectId={workItemId}
                    onSuccess={() => {
                      setShowOutcomeForm(false);
                      // Reload outcomes
                    }}
                  />
                  <button
                    onClick={() => setShowOutcomeForm(false)}
                    className="mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="mt-4">
                <OutcomeList projectId={workItem.project_id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={(status, blockedReason) =>
            handleTaskStatusChange(selectedTask.id, status, blockedReason)
          }
          onRefresh={() => {
            loadTasks();
            loadWorkItem();
          }}
        />
      )}
    </div>
  );
}

