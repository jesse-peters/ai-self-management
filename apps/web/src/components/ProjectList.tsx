'use client';

import { useState } from 'react';
import { Project } from '@projectflow/core';
import Link from 'next/link';
import { ProjectManifestModal } from './ProjectManifestModal';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId?: string;
  onSelectProject: (projectId: string) => void;
  isLoading?: boolean;
}

export function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  isLoading = false,
}: ProjectListProps) {
  const [manifestProject, setManifestProject] = useState<Project | null>(null);
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setManifestProject(project);
                }}
                className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Generate .pm/project.json manifest"
              >
                📄 Manifest
              </button>
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
    </>
  );
}



