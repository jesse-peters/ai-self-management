'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkItemSummary, Project } from '@projectflow/core';
import { WorkItemCard } from '@/components/WorkItemCard';
import { createBrowserClient } from '@/lib/supabaseClient';
import { listProjects } from '@projectflow/core';

function WorkItemsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    searchParams.get('projectId') || undefined
  );
  const [workItems, setWorkItems] = useState<WorkItemSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<'open' | 'in_progress' | 'done' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newExternalUrl, setNewExternalUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Load projects
  const loadProjects = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = createBrowserClient();
      const data = await listProjects(supabase);
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  }, [user, selectedProjectId]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  // Load work items
  const loadWorkItems = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ projectId: selectedProjectId });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/work-items?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load work items');
      
      const data = await response.json();
      setWorkItems(data.workItems || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work items');
      console.error('Error loading work items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, statusFilter]);

  useEffect(() => {
    if (selectedProjectId) {
      loadWorkItems();
    }
  }, [selectedProjectId, statusFilter, loadWorkItems]);

  // Update URL when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const params = new URLSearchParams({ projectId: selectedProjectId });
      router.push(`/work-items?${params.toString()}`, { scroll: false });
    }
  }, [selectedProjectId, router]);

  const handleCreateWorkItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId || !newTitle.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          external_url: newExternalUrl.trim() || undefined,
          status: 'open',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create work item');
      }

      // Reset form and close modal
      setNewTitle('');
      setNewDescription('');
      setNewExternalUrl('');
      setShowCreateModal(false);
      
      // Reload work items
      await loadWorkItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create work item');
    } finally {
      setIsCreating(false);
    }
  };

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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Work Items</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Track external tickets and organize agent tasks
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!selectedProjectId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + New Work Item
            </button>
          </div>
        </div>

        {/* Project Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project
          </label>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
            {/* Status Filter */}
            <div className="mb-6">
              <div className="flex gap-2">
                {(['all', 'open', 'in_progress', 'done'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Work Items Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded-lg" />
                ))}
              </div>
            ) : workItems.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-2">No work items found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Create a work item to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workItems.map((workItem) => (
                  <WorkItemCard key={workItem.id} workItem={workItem} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Create Work Item
                </h2>
                <form onSubmit={handleCreateWorkItem} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Brief title for the work item"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Optional description..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      External URL
                    </label>
                    <input
                      type="url"
                      value={newExternalUrl}
                      onChange={(e) => setNewExternalUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newTitle.trim()}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function WorkItemsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    }>
      <WorkItemsPageContent />
    </Suspense>
  );
}

