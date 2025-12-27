'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@/lib/supabaseClient';
import { listProjects, listWorkItems, type Project, type WorkItemSummary } from '@projectflow/core';
import Link from 'next/link';

export default function QualityDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingWorkItems, setIsLoadingWorkItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const loadProjects = useCallback(async () => {
    if (!user) return;

    setIsLoadingProjects(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const data = await listProjects(supabase);
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user, selectedProjectId]);

  const loadWorkItems = useCallback(async () => {
    if (!selectedProjectId || !user) return;

    setIsLoadingWorkItems(true);
    try {
      const supabase = createBrowserClient();
      const data = await listWorkItems(supabase, selectedProjectId);
      setWorkItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work items');
      console.error('Error loading work items:', err);
    } finally {
      setIsLoadingWorkItems(false);
    }
  }, [selectedProjectId, user]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      loadWorkItems();
    }
  }, [selectedProjectId, loadWorkItems]);

  if (authLoading || isLoadingProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calculate quality metrics
  const totalWorkItems = workItems.length;
  const workItemsWithFailingGates = workItems.filter(
    (wi) => wi.gate_status && !wi.gate_status.all_passing && wi.gate_status.required_failing.length > 0
  ).length;
  const workItemsWithMissingEvidence = workItems.filter(
    (wi) => wi.total_tasks > 0 && wi.evidence_count === 0
  ).length;
  const blockedTasks = workItems.reduce((sum, wi) => sum + wi.blocked_tasks, 0);
  const totalTasks = workItems.reduce((sum, wi) => sum + wi.total_tasks, 0);
  const doneTasks = workItems.reduce((sum, wi) => sum + wi.done_tasks, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Quality Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor project health, gate status, and blockers
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Project Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project:
          </label>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Select a project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProjectId && (
          <>
            {/* Quality Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Work Items
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {totalWorkItems}
                    </p>
                  </div>
                  <div className="text-3xl">📋</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Failing Gates
                    </p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {workItemsWithFailingGates}
                    </p>
                  </div>
                  <div className="text-3xl">❌</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Missing Evidence
                    </p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                      {workItemsWithMissingEvidence}
                    </p>
                  </div>
                  <div className="text-3xl">🚫</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Blocked Tasks
                    </p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {blockedTasks}
                    </p>
                  </div>
                  <div className="text-3xl">🔒</div>
                </div>
              </div>
            </div>

            {/* Work Items with Issues */}
            <div className="space-y-6">
              {/* Work Items with Failing Gates */}
              {workItemsWithFailingGates > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Work Items with Failing Gates ({workItemsWithFailingGates})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workItems
                      .filter(
                        (wi) =>
                          wi.gate_status &&
                          !wi.gate_status.all_passing &&
                          wi.gate_status.required_failing.length > 0
                      )
                      .map((wi) => (
                        <Link
                          key={wi.id}
                          href={`/work-items/${wi.id}`}
                          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {wi.title}
                          </h3>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {wi.gate_status?.required_failing.length} gate(s) failing
                          </p>
                        </Link>
                      ))}
                  </div>
                </div>
              )}

              {/* Work Items Missing Evidence */}
              {workItemsWithMissingEvidence > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Work Items Missing Evidence ({workItemsWithMissingEvidence})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workItems
                      .filter((wi) => wi.total_tasks > 0 && wi.evidence_count === 0)
                      .map((wi) => (
                        <Link
                          key={wi.id}
                          href={`/work-items/${wi.id}`}
                          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {wi.title}
                          </h3>
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            {wi.total_tasks} task(s) with no evidence
                          </p>
                        </Link>
                      ))}
                  </div>
                </div>
              )}

              {/* Blocked Tasks */}
              {blockedTasks > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Blocked Tasks ({blockedTasks})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workItems
                      .filter((wi) => wi.blocked_tasks > 0)
                      .map((wi) => (
                        <Link
                          key={wi.id}
                          href={`/work-items/${wi.id}`}
                          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {wi.title}
                          </h3>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {wi.blocked_tasks} task(s) blocked
                          </p>
                        </Link>
                      ))}
                  </div>
                </div>
              )}

              {/* All Clear */}
              {workItemsWithFailingGates === 0 &&
                workItemsWithMissingEvidence === 0 &&
                blockedTasks === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      All Clear!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No quality issues detected. Great work!
                    </p>
                  </div>
                )}
            </div>
          </>
        )}

        {!selectedProjectId && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              Select a project to view quality metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

