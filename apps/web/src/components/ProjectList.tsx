'use client';

import { useState } from 'react';
import { Project } from '@projectflow/core';
import Link from 'next/link';
import { ProjectManifestModal } from './ProjectManifestModal';
import { ConfirmDialog } from './ConfirmDialog';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId?: string;
  onSelectProject: (projectId: string) => void;
  onProjectDeleted?: (projectId: string) => void;
  isLoading?: boolean;
}

export function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  onProjectDeleted,
  isLoading = false,
}: ProjectListProps) {
  const [manifestProject, setManifestProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setProjectToDelete(project);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete project');
      }

      // Notify parent to refresh project list
      if (onProjectDeleted) {
        onProjectDeleted(projectToDelete.id);
      }

      // Close the dialog
      setProjectToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setProjectToDelete(null);
    setIsDeleting(false);
  };
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No projects yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">Create a project to get started</p>
        <Link
          href="/wizard"
          className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors"
        >
          Create New Project
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="mb-4">
          <Link
            href="/wizard"
            className="w-full inline-block text-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors"
          >
            + New Project
          </Link>
        </div>
        {projects.map((project) => (
          <div
            key={project.id}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selectedProjectId === project.id
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex justify-between items-start">
              <button
                onClick={() => onSelectProject(project.id)}
                className="flex-1 text-left"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{project.description}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </button>
              <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setManifestProject(project);
                  }}
                  className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Generate .pm/project.json manifest"
                >
                  📄 Manifest
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(project.id);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5"
                  title="Delete project"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165l0.01-.004L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397M7.5 21.75h12m-12 0a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a2.25 2.25 0 002.244 2.077h.011M7.5 21.75v-5.25m0 0h12v5.25m-12 0a2.25 2.25 0 01-2.244-2.077L4.772 5.79"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {manifestProject && (
        <ProjectManifestModal
          project={manifestProject}
          isOpen={true}
          onClose={() => setManifestProject(null)}
        />
      )}

      {projectToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Project?"
          message={`Are you sure you want to delete "${projectToDelete.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          confirmVariant="danger"
        />
      )}
    </>
  );
}



