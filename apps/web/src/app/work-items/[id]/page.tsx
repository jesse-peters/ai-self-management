'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkItemSummary, AgentTaskWithDetails, GateStatusSummary, Outcome } from '@projectflow/core';
import type { Evidence } from '@projectflow/db';
import { AgentTaskCard } from '@/components/AgentTaskCard';
import { TaskDrawer } from '@/components/TaskDrawer';
import { GateStatusBadge } from '@/components/GateStatusBadge';
import { OutcomeForm } from '@/components/OutcomeForm';
import { OutcomeList } from '@/components/OutcomeList';
import { EvidenceCard } from '@/components/EvidenceCard';
import { EventTimeline } from '@/components/EventTimeline';
import { GateStatusIndicator } from '@/components/GateStatusIndicator';
import { TaskProgressBar } from '@/components/TaskProgressBar';

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
  const [activeTab, setActiveTab] = useState<'tasks' | 'timeline' | 'evidence' | 'outcomes'>('tasks');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState<'all' | 'note' | 'link' | 'log' | 'diff'>('all');
  const [evidenceSort, setEvidenceSort] = useState<'recent' | 'oldest'>('recent');
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

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

  const loadEvidence = useCallback(async () => {
    if (!workItem) return;
    setIsLoadingEvidence(true);
    try {
      const params = new URLSearchParams({
        projectId: workItem.project_id,
        workItemId: workItemId,
      });
      const response = await fetch(`/api/evidence?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load evidence');
      const data = await response.json();
      setEvidence(data.evidence || []);
    } catch (err) {
      console.error('Error loading evidence:', err);
    } finally {
      setIsLoadingEvidence(false);
    }
  }, [workItem, workItemId]);

  const loadTimeline = useCallback(async () => {
    if (!workItem) return;
    setIsLoadingTimeline(true);
    try {
      const params = new URLSearchParams({
        projectId: workItem.project_id,
        workItemId: workItemId,
        limit: '50',
      });
      const response = await fetch(`/api/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load timeline');
      const data = await response.json();
      setTimelineEvents(data.events || []);
    } catch (err) {
      console.error('Error loading timeline:', err);
    } finally {
      setIsLoadingTimeline(false);
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
      if (activeTab === 'evidence') loadEvidence();
      if (activeTab === 'timeline') loadTimeline();
    }
  }, [workItem, loadTasks, loadGateStatus, activeTab, loadEvidence, loadTimeline]);

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

  // Group tasks by type
  const tasksByType: Record<'research' | 'implement' | 'verify' | 'docs' | 'cleanup', AgentTaskWithDetails[]> = {
    research: tasks.filter((t) => t.type === 'research'),
    implement: tasks.filter((t) => t.type === 'implement'),
    verify: tasks.filter((t) => t.type === 'verify'),
    docs: tasks.filter((t) => t.type === 'docs'),
    cleanup: tasks.filter((t) => t.type === 'cleanup'),
  };

  // Calculate progress
  const readyTasks = Math.max(0, workItem.total_tasks - workItem.done_tasks - workItem.doing_tasks - workItem.blocked_tasks);

  // Filter and sort evidence
  const filteredEvidence = evidence
    .filter((item) => evidenceTypeFilter === 'all' || item.type === evidenceTypeFilter)
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return evidenceSort === 'recent' ? dateB - dateA : dateA - dateB;
    });

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
          
          <div className="flex items-start justify-between mb-6">
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
                  {workItem.external_url}
                </a>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Gate status indicators */}
              {workItem.gate_status && (
                <div className="flex items-center gap-1">
                  {gateStatus.map((gate) => (
                    <GateStatusIndicator
                      key={gate.gate_id}
                      status={gate.latest_status === 'passing' ? 'passing' : gate.latest_status === 'failing' ? 'failing' : 'not_run'}
                      gateName={gate.gate_name}
                      size="sm"
                      inline
                    />
                  ))}
                </div>
              )}
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

          {/* Definition of Done */}
          {workItem.definition_of_done && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Definition of Done
              </h3>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {workItem.definition_of_done.split('\n').map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <span>{line.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8" aria-label="Tabs">
            {(['tasks', 'timeline', 'evidence', 'outcomes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2">
            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                {(['research', 'implement', 'verify', 'docs', 'cleanup'] as TaskType[]).map((type) => {
                  const typeTasks = tasksByType[type];
                  if (typeTasks.length === 0) return null;

                  return (
                    <div key={type} className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {type.charAt(0).toUpperCase() + type.slice(1)} ({typeTasks.length})
                      </h3>
                      <div className="space-y-2">
                        {typeTasks.map((task) => (
                          <AgentTaskCard
                            key={task.id}
                            task={task}
                            onClick={() => setSelectedTask(task)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No tasks yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab - This will be replaced by the full-width timeline tab below */}

            {/* Evidence Tab - This will be replaced by the full-width evidence tab below */}

            {/* Outcomes Tab */}
            {activeTab === 'outcomes' && (
              <div className="space-y-4">
                <OutcomeList projectId={workItem.project_id} />
              </div>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Gates */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Gates</h3>
              {gateStatus.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No gates configured</p>
              ) : (
                <div className="space-y-2">
                  {gateStatus.map((gate) => (
                    <div key={gate.gate_id} className="flex items-center justify-between">
                      <GateStatusIndicator
                        status={gate.latest_status === 'passing' ? 'passing' : gate.latest_status === 'failing' ? 'failing' : 'not_run'}
                        gateName={gate.gate_name}
                        size="sm"
                        inline
                        showLabel
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Progress</h3>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div>Done: {workItem.done_tasks}/{workItem.total_tasks}</div>
                <div>Doing: {workItem.doing_tasks}/{workItem.total_tasks}</div>
                <div>Ready: {readyTasks}/{workItem.total_tasks}</div>
                <TaskProgressBar
                  done={workItem.done_tasks}
                  doing={workItem.doing_tasks}
                  ready={readyTasks}
                  blocked={workItem.blocked_tasks}
                  total={workItem.total_tasks}
                  showLabels={false}
                  size="sm"
                />
              </div>
            </div>

            {/* Blockers */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Blockers</h3>
              {workItem.blocked_tasks === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">None</p>
              ) : (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {workItem.blocked_tasks} task{workItem.blocked_tasks !== 1 ? 's' : ''} blocked
                </p>
              )}
            </div>
          </div>
        </div>
        )}


        {activeTab === 'evidence' && (
          <div>
            {/* Filters and Sort */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter:
                </label>
                <select
                  value={evidenceTypeFilter}
                  onChange={(e) => setEvidenceTypeFilter(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="diff">Diffs</option>
                  <option value="link">Links</option>
                  <option value="log">Logs</option>
                  <option value="note">Notes</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort:
                </label>
                <select
                  value={evidenceSort}
                  onChange={(e) => setEvidenceSort(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="recent">Recent</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            {/* Evidence Grid */}
            {evidenceLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded-lg" />
                ))}
              </div>
            ) : filteredEvidence.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">No evidence found</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Evidence provides proof of work completed
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvidence.map((item) => {
                  // Find task key if evidence is attached to a task
                  const task = item.task_id ? tasks.find((t) => t.id === item.task_id) : null;
                  return (
                    <EvidenceCard
                      key={item.id}
                      evidence={item}
                      taskKey={task?.task_key || undefined}
                      onViewDetails={setSelectedEvidence}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'outcomes' && (
          <div className="space-y-6">
            {!showOutcomeForm ? (
              <button
                onClick={() => setShowOutcomeForm(true)}
                className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
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

            <div>
              <OutcomeList projectId={workItem.project_id} />
            </div>
          </div>
        )}
      </div>

      {/* Evidence Detail Modal */}
      {selectedEvidence && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvidence(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Evidence Details
                </h2>
                <button
                  onClick={() => setSelectedEvidence(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                    {selectedEvidence.type}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Created By
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                    {selectedEvidence.created_by}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Created At
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(selectedEvidence.created_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Content
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    {selectedEvidence.type === 'link' ? (
                      <a
                        href={selectedEvidence.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        {selectedEvidence.content}
                      </a>
                    ) : (
                      <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-sans">
                        {selectedEvidence.content}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

