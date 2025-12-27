/**
 * Semantic color system for ProjectFlow dashboard
 * Communicates task type and status through consistent, meaningful colors
 */

export type TaskType = 'research' | 'implement' | 'verify' | 'docs' | 'cleanup';
export type GateStatus = 'passing' | 'failing' | 'not_run';
export type TaskStatus = 'ready' | 'doing' | 'blocked' | 'review' | 'done';

/**
 * Task Type Colors - Primary colors for each task type
 * Used throughout UI for consistency and semantic meaning
 */
export const TASK_TYPE_COLORS: Record<TaskType, { light: string; dark: string; bg: string; border: string }> = {
    research: {
        light: '#8B5CF6', // purple-500
        dark: '#A78BFA', // purple-400
        bg: '#EDE9FE', // purple-100
        border: '#C4B5FD', // purple-300
    },
    implement: {
        light: '#3B82F6', // blue-500
        dark: '#60A5FA', // blue-400
        bg: '#DBEAFE', // blue-100
        border: '#93C5FD', // blue-300
    },
    verify: {
        light: '#10B981', // green-500
        dark: '#34D399', // green-400
        bg: '#D1FAE5', // green-100
        border: '#6EE7B7', // green-300
    },
    docs: {
        light: '#F59E0B', // amber-500
        dark: '#FBBF24', // amber-400
        bg: '#FEF3C7', // amber-100
        border: '#FCD34D', // amber-300
    },
    cleanup: {
        light: '#6B7280', // gray-500
        dark: '#9CA3AF', // gray-400
        bg: '#F3F4F6', // gray-100
        border: '#D1D5DB', // gray-300
    },
};

/**
 * Status Colors - Secondary colors for task and gate status
 */
export const STATUS_COLORS = {
    passing: '#10B981', // green-500
    failing: '#EF4444', // red-500
    warning: '#F59E0B', // amber-500
    info: '#3B82F6', // blue-500
    blocked: '#EF4444', // red-500
    review: '#F59E0B', // amber-500
} as const;

/**
 * Tailwind CSS classes for task types
 * Used for applying background, text, and border colors
 */
export const TASK_TYPE_CLASSES: Record<TaskType, string> = {
    research: 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200 border-purple-300 dark:border-purple-700',
    implement: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    verify: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200 border-green-300 dark:border-green-700',
    docs: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    cleanup: 'bg-gray-100 text-gray-900 dark:bg-gray-900/30 dark:text-gray-200 border-gray-300 dark:border-gray-700',
};

/**
 * Tailwind CSS classes for status badges
 */
export const STATUS_BADGE_CLASSES: Record<GateStatus, string> = {
    passing: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200',
    failing: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
    not_run: 'bg-gray-100 text-gray-900 dark:bg-gray-900/30 dark:text-gray-200',
};

/**
 * Task type labels with emojis for display
 */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
    research: '🔍 Research',
    implement: '⚙️ Implement',
    verify: '✓ Verify',
    docs: '📄 Docs',
    cleanup: '🧹 Cleanup',
};

/**
 * Task status labels for display
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    ready: 'Ready',
    doing: 'In Progress',
    blocked: 'Blocked',
    review: 'Review',
    done: 'Done',
};

/**
 * Gate status indicators
 */
export const GATE_STATUS_ICONS: Record<GateStatus, string> = {
    passing: '⚡',
    failing: '❌',
    not_run: '⚪',
};

/**
 * Get CSS class for task type badge
 */
export function getTaskTypeClass(taskType: TaskType): string {
    return TASK_TYPE_CLASSES[taskType];
}

/**
 * Get CSS class for gate status badge
 */
export function getGateStatusClass(status: GateStatus): string {
    return STATUS_BADGE_CLASSES[status];
}

/**
 * Get hex color for task type
 */
export function getTaskTypeColor(taskType: TaskType, isDark: boolean = false): string {
    return isDark ? TASK_TYPE_COLORS[taskType].dark : TASK_TYPE_COLORS[taskType].light;
}

/**
 * Get gate status icon
 */
export function getGateStatusIcon(status: GateStatus): string {
    return GATE_STATUS_ICONS[status];
}

