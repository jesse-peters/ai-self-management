'use client';

import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface DeleteButtonProps {
  onDelete: () => Promise<void>;
  entityName: string;
  entityId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'button';
}

export function DeleteButton({
  onDelete,
  entityName,
  entityId,
  className = '',
  size = 'md',
  variant = 'icon',
}: DeleteButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await onDelete();
      setIsDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-8 w-8 p-1.5',
    lg: 'h-10 w-10 p-2',
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className={`inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${sizeClasses[size]} ${className}`}
          aria-label={`Delete ${entityName}`}
          title={`Delete ${entityName}`}
        >
          <svg
            className={iconSize[size]}
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
        </button>

        <ConfirmDialog
          isOpen={isDialogOpen}
          title={`Delete ${entityName}?`}
          message={`Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => {
            setIsDialogOpen(false);
            setError(null);
          }}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        />

        {error && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </>
    );
  }

  if (variant === 'text') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className={`text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium ${className}`}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>

        <ConfirmDialog
          isOpen={isDialogOpen}
          title={`Delete ${entityName}?`}
          message={`Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => {
            setIsDialogOpen(false);
            setError(null);
          }}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        />
      </>
    );
  }

  // variant === 'button'
  return (
    <>
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        className={`inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 ${className}`}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>

      <ConfirmDialog
        isOpen={isDialogOpen}
        title={`Delete ${entityName}?`}
        message={`Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDialogOpen(false);
          setError(null);
        }}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
      />
    </>
  );
}


