'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectList } from '@/components/ProjectList';
import { TaskList } from '@/components/TaskList';
import { MCPSetup } from '@/components/MCPSetup';
import { EventTimeline } from '@/components/EventTimeline';
import { CheckpointList } from '@/components/CheckpointList';
import { DecisionLog } from '@/components/DecisionLog';
import { listProjects, listTasks, type Project, type Task } from '@projectflow/core';

type DashboardTab = 'tasks' | 'events' | 'checkpoints' | 'decisions';

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
      const data = await listProjects(user.id);
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
        const data = await listTasks(user.id, projectId);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here are your projects and tasks.</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* MCP Setup Section */}
        <MCPSetup />

        {/* Active Task Banner */}
        {selectedProjectId && activeTask && (
          <div className="mb-6 rounded-lg border-2 border-blue-500 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Active Task</h3>
                <p className="text-sm text-blue-800">{activeTask.title}</p>
                {(activeTask as Task & { locked_by?: string }).locked_by && (
                  <p className="text-xs text-blue-600 mt-1">
                    Locked by: {(activeTask as Task & { locked_by?: string }).locked_by}
                  </p>
                )}
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
                {activeTask.status === 'in_progress' ? 'In Progress' : 'Locked'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Column */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Projects</h2>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {projects.find((p) => p.id === selectedProjectId)?.name || 'Project'}
                </h2>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    {(['tasks', 'events', 'checkpoints', 'decisions'] as DashboardTab[]).map(
                      (tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                    <TaskList tasks={tasks} isLoading={isLoadingTasks} />
                  )}
                  {activeTab === 'events' && <EventTimeline projectId={selectedProjectId} />}
                  {activeTab === 'checkpoints' && (
                    <CheckpointList projectId={selectedProjectId} />
                  )}
                  {activeTab === 'decisions' && <DecisionLog projectId={selectedProjectId} />}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">Select a project to view its details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

