'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectList } from '@/components/ProjectList';
import { TaskList } from '@/components/TaskList';
import { listProjects, listTasks, type Project, type Task } from '@projectflow/core';
import { createBrowserClient } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Load projects when user is available
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  // Load tasks when project is selected
  useEffect(() => {
    if (selectedProjectId && user) {
      loadTasks(selectedProjectId);
    }
  }, [selectedProjectId, user]);

  const loadProjects = async () => {
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
  };

  const loadTasks = async (projectId: string) => {
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
  };

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

          {/* Tasks Column */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {selectedProjectId
                ? projects.find((p) => p.id === selectedProjectId)?.name || 'Tasks'
                : 'Select a project'}
            </h2>
            {selectedProjectId ? (
              <TaskList tasks={tasks} isLoading={isLoadingTasks} />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">Select a project to view its tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

