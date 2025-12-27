'use client';

import { useState } from 'react';
import type { Evidence } from '@projectflow/core';

interface EvidenceCardProps {
  evidence: Evidence;
  taskTitle?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * EvidenceCard component - grid card for evidence items
 * Type-specific icons and colors with quick actions
 */
export function EvidenceCard({ 
  evidence, 
  taskTitle,
  onClick,
  className = '' 
}: EvidenceCardProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  const evidenceTypeIcons = {
    note: '💬',
    link: '🔗',
    log: '📋',
    diff: '📄',
  };

  const evidenceTypeColors = {
    note: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    link: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    log: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    diff: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isLink = evidence.type === 'link';
  const contentPreview = evidence.content.length > 100 
    ? evidence.content.substring(0, 100) + '...'
    : evidence.content;

  return (
    <div
      className={`
        border rounded-lg p-4
        ${evidenceTypeColors[evidence.type as keyof typeof evidenceTypeColors]}
        hover:shadow-md transition-all
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {evidenceTypeIcons[evidence.type as keyof typeof evidenceTypeIcons]}
          </span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
            {evidence.type}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {evidence.created_by === 'agent' ? '🤖' : '👤'}
        </span>
      </div>

      {/* Task association */}
      {taskTitle && (
        <div className="mb-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {taskTitle}
          </span>
        </div>
      )}

      {/* Content preview */}
      <div className="mb-2">
        {isLink ? (
          <a
            href={evidence.content}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {evidence.content}
          </a>
        ) : (
          <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
            {contentPreview}
          </p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatTime(evidence.created_at)}</span>
        {evidence.type === 'link' && (
          <span className="text-green-600 dark:text-green-400">✅ Has URL</span>
        )}
        {evidence.type !== 'link' && evidence.content.length > 0 && (
          <span className="text-green-600 dark:text-green-400">✅ Has content</span>
        )}
        {evidence.type === 'note' && evidence.content.toLowerCase().includes('blocked') && (
          <span className="text-red-600 dark:text-red-400 ml-2">🚫 Blocker</span>
        )}
      </div>

      {/* Expand preview button */}
      {!isLink && evidence.content.length > 100 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPreviewExpanded(!isPreviewExpanded);
          }}
          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isPreviewExpanded ? 'Show less' : 'View full content'}
        </button>
      )}

      {/* Full content (when expanded) */}
      {isPreviewExpanded && !isLink && (
        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {evidence.content}
          </pre>
        </div>
      )}
    </div>
  );
}
