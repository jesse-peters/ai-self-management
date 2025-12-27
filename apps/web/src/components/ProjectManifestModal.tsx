'use client';

import { useState, useEffect } from 'react';
import type { Project, ProjectManifest } from '@projectflow/core';

interface ProjectManifestModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectManifestModal({
  project,
  isOpen,
  onClose,
}: ProjectManifestModalProps) {
  const [manifest, setManifest] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project) {
      loadManifest();
    }
  }, [isOpen, project]);

  const loadManifest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/manifest`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to load manifest');
      }
      const result = await response.json();
      const manifestData: ProjectManifest = result.data.manifest;
      // Format as JSON string for display
      setManifest(JSON.stringify(manifestData, null, 2));
    } catch (err) {
      console.error('Error loading manifest:', err);
      setError(err instanceof Error ? err.message : 'Failed to load manifest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(manifest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([manifest], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Project Manifest
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Copy this file to <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.pm/project.json</code> in your repository root
          </p>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading manifest...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={loadManifest}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 text-sm overflow-x-auto">
              <code className="text-gray-800 dark:text-gray-200">{manifest}</code>
            </pre>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>1. Copy the manifest above</p>
            <p>2. Create <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.pm</code> directory in your repo</p>
            <p>3. Paste as <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.pm/project.json</code></p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !!error || !manifest}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !!error || !manifest}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


