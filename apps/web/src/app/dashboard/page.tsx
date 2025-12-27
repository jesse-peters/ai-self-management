'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@/lib/supabaseClient';
import { ProjectList } from '@/components/ProjectList';
import { WorkItemCard } from '@/components/WorkItemCard';
import { ProjectManifestModal } from '@/components/ProjectManifestModal';
import { listProjects, listWorkItems, type Project, type WorkItemSummary } from '@projectflow/core';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingWorkItems, setIsLoadingWorkItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manifestProject, setManifestProject] = useState<Project | null>(null);

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

  const loadWorkItems = useCallback(
    async (projectId: string) => {
      if (!user) return;

      setIsLoadingWorkItems(true);
      setError(null);
      try {
        const supabase = createBrowserClient();
        const data = await listWorkItems(supabase, projectId);
        setWorkItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load work items');
        console.error('Error loading work items:', err);
      } finally {
        setIsLoadingWorkItems(false);
      }
    },
    [user]
  );

  // Load projects when user is available
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  // Load work items when project is selected
  useEffect(() => {
    if (selectedProjectId && user) {
      loadWorkItems(selectedProjectId);
    }
  }, [selectedProjectId, user, loadWorkItems]);

  // Calculate project metrics from work items
  const projectMetrics = selectedProjectId
    ? {
        totalTasks: workItems.reduce((sum, wi) => sum + wi.total_tasks, 0),
        doneTasks: workItems.reduce((sum, wi) => sum + wi.done_tasks, 0),
        doingTasks: workItems.reduce((sum, wi) => sum + wi.doing_tasks, 0),
        blockedTasks: workItems.reduce((sum, wi) => sum + wi.blocked_tasks, 0),
        totalWorkItems: workItems.length,
        gatesPassing: workItems.filter(
          (wi) => wi.gate_status?.all_passing
        ).length,
        gatesFailing: workItems.filter(
          (wi) => wi.gate_status && !wi.gate_status.all_passing && wi.gate_status.required_failing.length > 0
        ).length,
        missingEvidence: workItems.filter(
          (wi) => wi.total_tasks > 0 && wi.evidence_count === 0
        ).length,
        lockedTasks: workItems.reduce((sum, wi) => sum + (wi.doing_tasks > 0 ? 1 : 0), 0),
      }
    : null;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ProjectFlow</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Project overview and work items</p>
          </div>
          <div className="flex items-center gap-4">
            {selectedProject && (
              <Link
                href="/work-items"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All Work Items
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-6">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Project Selector and Status Banner */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              {selectedProject && (
                <button
                  onClick={() => setManifestProject(selectedProject)}
                  className="px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Generate .pm/project.json manifest"
                >
                  📄 Manifest
                </button>
              )}
            </div>
            {projectMetrics && (
              <Link
                href="/dashboard/quality"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Quality Dashboard →
              </Link>
            )}
          </div>

          {/* Status Banner */}
          {selectedProjectId && projectMetrics && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                {/* Gates Status */}
                {projectMetrics.gatesPassing + projectMetrics.gatesFailing > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {projectMetrics.gatesPassing > 0 ? '⚡' : '❌'}
                    </span>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {projectMetrics.gatesPassing}/{projectMetrics.gatesPassing + projectMetrics.gatesFailing} gates
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">passing</span>
                    </div>
                  </div>
                )}
                
                {/* Tasks Done */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {projectMetrics.doneTasks} tasks
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">done</span>
                  </div>
                </div>
                
                {/* Missing Evidence */}
                {projectMetrics.missingEvidence > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚫</span>
                    <div>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {projectMetrics.missingEvidence} tasks
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">missing evidence</span>
                    </div>
                  </div>
                )}
                
                {/* Locked Tasks */}
                {projectMetrics.lockedTasks > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔒</span>
                    <div>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {projectMetrics.lockedTasks} task{projectMetrics.lockedTasks !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">locked</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Work Items Grid */}
        {selectedProjectId ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Work Items
              </h2>
              <Link
                href={`/work-items?projectId=${selectedProjectId}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                + New Work Item
              </Link>
            </div>

            {isLoadingWorkItems ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded-lg" />
                ))}
              </div>
            ) : workItems.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-2">No work items found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                  Create a work item to get started
                </p>
                <Link
                  href={`/work-items?projectId=${selectedProjectId}`}
                  className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  + New Work Item
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workItems.map((workItem) => (
                  <WorkItemCard key={workItem.id} workItem={workItem} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Select a project to view its work items</p>
          </div>
        )}
      </div>

      {manifestProject && (
        <ProjectManifestModal
          project={manifestProject}
          isOpen={true}
          onClose={() => setManifestProject(null)}
        />
      )}
    </div>
  );
}

