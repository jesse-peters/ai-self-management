'use client';

import { useState } from 'react';

interface FileComparisonViewProps {
  expectedFiles: string[];
  touchedFiles: string[];
  className?: string;
}

type FileStatus = 'expected' | 'unexpected' | 'missing';

interface FileItem {
  path: string;
  status: FileStatus;
}

/**
 * FileComparisonView component
 * 
 * Displays a comparison between expected files and touched files for a task.
 * Shows match indicators:
 * - ✅ expected: File is in both expected and touched
 * - ⚠️ unexpected: File is in touched but not expected
 * - 🚫 missing: File is in expected but not touched
 */
export function FileComparisonView({ 
  expectedFiles, 
  touchedFiles, 
  className = '' 
}: FileComparisonViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate file statuses
  const fileMap = new Map<string, FileStatus>();
  
  // Mark all expected files
  expectedFiles.forEach(file => {
    fileMap.set(file, 'missing'); // Start as missing, will be updated if found
  });
  
  // Check touched files
  touchedFiles.forEach(file => {
    if (fileMap.has(file)) {
      fileMap.set(file, 'expected'); // Found in both
    } else {
      fileMap.set(file, 'unexpected'); // Only in touched
    }
  });

  // Convert to array and sort
  const fileItems: FileItem[] = Array.from(fileMap.entries())
    .map(([path, status]) => ({ path, status }))
    .sort((a, b) => {
      // Sort by status priority: expected first, then missing, then unexpected
      const statusOrder: Record<FileStatus, number> = {
        expected: 0,
        missing: 1,
        unexpected: 2,
      };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      // Then sort alphabetically
      return a.path.localeCompare(b.path);
    });

  const expectedCount = fileItems.filter(f => f.status === 'expected').length;
  const missingCount = fileItems.filter(f => f.status === 'missing').length;
  const unexpectedCount = fileItems.filter(f => f.status === 'unexpected').length;

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'expected':
        return '✅';
      case 'unexpected':
        return '⚠️';
      case 'missing':
        return '🚫';
    }
  };

  const getStatusLabel = (status: FileStatus) => {
    switch (status) {
      case 'expected':
        return 'expected';
      case 'unexpected':
        return 'unexpected';
      case 'missing':
        return 'missing';
    }
  };

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case 'expected':
        return 'text-green-600 dark:text-green-400';
      case 'unexpected':
        return 'text-amber-600 dark:text-amber-400';
      case 'missing':
        return 'text-red-600 dark:text-red-400';
    }
  };

  // Don't render if there are no files at all
  if (expectedFiles.length === 0 && touchedFiles.length === 0) {
    return null;
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Files
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({expectedCount} expected, {missingCount} missing, {unexpectedCount} unexpected)
          </span>
        </div>
        <span className="text-gray-400 dark:text-gray-500">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Expected Files Section */}
          {expectedFiles.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Expected Files
              </h4>
              <div className="space-y-1">
                {expectedFiles.map((file) => {
                  const status = fileMap.get(file) || 'missing';
                  return (
                    <div
                      key={`expected-${file}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className={getStatusColor(status)}>
                        {getStatusIcon(status)}
                      </span>
                      <span className="text-gray-900 dark:text-white font-mono text-xs">
                        {file}
                      </span>
                      <span className={`text-xs ${getStatusColor(status)}`}>
                        ({getStatusLabel(status)})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Touched Files Section */}
          {touchedFiles.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Touched Files
              </h4>
              <div className="space-y-1">
                {touchedFiles.map((file) => {
                  const status = fileMap.get(file) || 'unexpected';
                  return (
                    <div
                      key={`touched-${file}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className={getStatusColor(status)}>
                        {getStatusIcon(status)}
                      </span>
                      <span className="text-gray-900 dark:text-white font-mono text-xs">
                        {file}
                      </span>
                      <span className={`text-xs ${getStatusColor(status)}`}>
                        ({getStatusLabel(status)})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {fileItems.length > 0 && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>{expectedCount} file{expectedCount !== 1 ? 's' : ''} match expected</span>
                </div>
                {missingCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span>🚫</span>
                    <span>{missingCount} expected file{missingCount !== 1 ? 's' : ''} not touched</span>
                  </div>
                )}
                {unexpectedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{unexpectedCount} unexpected file{unexpectedCount !== 1 ? 's' : ''} touched</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {expectedFiles.length === 0 && touchedFiles.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No files specified
            </div>
          )}
        </div>
      )}
    </div>
  );
}


