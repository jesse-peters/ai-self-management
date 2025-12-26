'use client';

import { Project } from '@projectflow/core';

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
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">No projects yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Create a project to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onSelectProject(project.id)}
          className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
            selectedProjectId === project.id
              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{project.description}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Created {new Date(project.created_at).toLocaleDateString()}
          </p>
        </button>
      ))}
    </div>
  );
}



