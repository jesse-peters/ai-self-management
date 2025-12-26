'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@/lib/supabaseClient';
import { ProjectList } from '@/components/ProjectList';
import { TaskList } from '@/components/TaskList';
import { MCPSetup } from '@/components/MCPSetup';
import { EventTimeline } from '@/components/EventTimeline';
import { CheckpointList } from '@/components/CheckpointList';
import { DecisionLog } from '@/components/DecisionLog';
import { ConstraintList } from '@/components/ConstraintList';
import { OutcomeList } from '@/components/OutcomeList';
import { listProjects, listTasks, type Project, type Task } from '@projectflow/core';

type DashboardTab = 'tasks' | 'events' | 'checkpoints' | 'decisions' | 'outcomes' | 'constraints';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<DashboardTab>('tasks');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
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

  const loadTasks = useCallback(
    async (projectId: string) => {
      if (!user) return;

      setIsLoadingTasks(true);
      setError(null);
      try {
        const supabase = createBrowserClient();
        const data = await listTasks(supabase, projectId);
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
        console.error('Error loading tasks:', err);
      } finally {
        setIsLoadingTasks(false);
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

  // Load tasks when project is selected
  useEffect(() => {
    if (selectedProjectId && user) {
      loadTasks(selectedProjectId);
    }
  }, [selectedProjectId, user, loadTasks]);

  // Get active/locked task
  const activeTask = tasks.find((task) => {
    const taskWithLock = task as Task & { locked_at?: string; locked_by?: string };
    return (
      taskWithLock.locked_at && (task.status === 'todo' || task.status === 'in_progress')
    );
  });

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back! Here are your projects and tasks.</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-6">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* MCP Setup Section */}
        <MCPSetup />

        {/* Active Task Banner */}
        {selectedProjectId && activeTask && (
          <div className="mb-6 rounded-lg border-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Active Task</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">{activeTask.title}</p>
                {(activeTask as Task & { locked_by?: string }).locked_by && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Locked by: {(activeTask as Task & { locked_by?: string }).locked_by}
                  </p>
                )}
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                {activeTask.status === 'in_progress' ? 'In Progress' : 'Locked'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Column */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Projects</h2>
            <ProjectList
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              isLoading={isLoadingProjects}
            />
          </div>

          {/* Main Content Column */}
          <div className="lg:col-span-2">
            {selectedProjectId ? (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {projects.find((p) => p.id === selectedProjectId)?.name || 'Project'}
                </h2>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8">
                    {(['tasks', 'events', 'checkpoints', 'decisions', 'outcomes', 'constraints'] as DashboardTab[]).map(
                      (tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab
                              ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      )
                    )}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                  {activeTab === 'tasks' && (
                    <TaskList tasks={tasks} isLoading={isLoadingTasks} projectId={selectedProjectId} />
                  )}
                  {activeTab === 'events' && <EventTimeline projectId={selectedProjectId} />}
                  {activeTab === 'checkpoints' && (
                    <CheckpointList projectId={selectedProjectId} />
                  )}
                  {activeTab === 'decisions' && <DecisionLog projectId={selectedProjectId} />}
                  {activeTab === 'outcomes' && <OutcomeList projectId={selectedProjectId} />}
                  {activeTab === 'constraints' && <ConstraintList projectId={selectedProjectId} />}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">Select a project to view its details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

