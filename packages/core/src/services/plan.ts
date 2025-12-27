/**
 * Plan Mode service - handles plan file parsing, validation, import/export
 * 
 * Plan Mode enables local plan files with stable task keys for Cursor coordination.
 * Plan files define work items as structured markdown that can be parsed and synced with the database.
 * 
 * IMPORTANT: This service uses RLS for security.
 * All functions accept an authenticated SupabaseClient.
 */

import type { AgentTask, AgentTaskInsert, WorkItem, Database } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { createAgentTask, updateAgentTask } from './agentTasks';
import { getWorkItem, updateWorkItem } from './workItems';
import { getProject } from './projects';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Plan file format version
 */
const PLAN_FORMAT_VERSION = '1.0';

/**
 * Task definition from a plan file
 */
export interface PlanTaskDefinition {
    key: string; // e.g., "task-001", "task-fix-auth"
    title: string;
    goal: string;
    type: 'research' | 'implement' | 'verify' | 'docs' | 'cleanup';
    context?: string;
    expectedFiles?: string[];
    subtasks?: Array<{
        key: string;
        title: string;
        status?: 'ready' | 'doing' | 'blocked' | 'done';
        dependencies?: string[];
    }>;
    gates?: string[];
    dependencies?: string[]; // References to other task keys
    timebox?: number; // Minutes
    risk?: 'low' | 'medium' | 'high';
}

/**
 * Work item plan structure
 */
export interface WorkItemPlan {
    version: string;
    workItemId?: string;
    title: string;
    description?: string;
    definitionOfDone?: string;
    tasks: PlanTaskDefinition[];
}

/**
 * Plan import result
 */
export interface PlanImportResult {
    workItemId: string;
    workItem: WorkItem;
    tasksCreated: number;
    tasksUpdated: number;
    taskMappings: Array<{
        taskKey: string;
        taskId: string;
    }>;
}

/**
 * Plan export result
 */
export interface PlanExportResult {
    plan: WorkItemPlan;
    content: string; // Markdown representation
}

/**
 * Plan validation result
 */
export interface PlanValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Parses a plan file (markdown format) into structured plan object
 * 
 * Plan markdown format:
 * ```
 * # Work Item Title
 * 
 * Description of work item
 * 
 * ## Definition of Done
 * - Acceptance criteria 1
 * - Acceptance criteria 2
 * 
 * ## Tasks
 * 
 * ### task-001: Task Title
 * Goal: Description of task goal
 * Type: implement
 * Timebox: 30 minutes
 * Risk: medium
 * Dependencies: task-002, task-003
 * Expected Files: src/auth.ts, src/auth.test.ts
 * 
 * #### Subtasks
 * - subtask-1: Subtask title
 * - subtask-2: Another subtask
 * 
 * #### Gates
 * - test
 * - lint
 * 
 * Context:
 * Additional context for the task
 * ```
 * 
 * @param planText Markdown plan file content
 * @returns Parsed plan structure
 * @throws ValidationError if plan format is invalid
 */
export function parsePlan(planText: string): WorkItemPlan {
    try {
        const plan: WorkItemPlan = {
            version: PLAN_FORMAT_VERSION,
            title: '',
            tasks: [],
        };

        // Parse title (first # heading)
        const titleMatch = planText.match(/^#\s+(.+)$/m);
        if (titleMatch) {
            plan.title = titleMatch[1].trim();
        } else {
            throw new ValidationError('Plan must start with a title (# Title)');
        }

        // Parse description (content before first ## heading)
        const firstHeading = planText.match(/^##\s+/m);
        if (firstHeading && firstHeading.index) {
            const descriptionText = planText
                .substring(0, firstHeading.index)
                .replace(/^#\s+.+\n/, '') // Remove title
                .trim();
            if (descriptionText) {
                plan.description = descriptionText;
            }
        }

        // Parse Definition of Done
        const defOfDoneMatch = planText.match(/##\s+Definition of Done\n([\s\S]*?)(?=##\s+|\Z)/i);
        if (defOfDoneMatch) {
            plan.definitionOfDone = defOfDoneMatch[1].trim();
        }

        // Parse tasks (### task-key: Title sections)
        // Split by ### to find each task
        const taskSections = planText.split(/^###\s+/m).slice(1); // Skip first split (before any ###)

        for (const section of taskSections) {
            // Parse task key and title
            const firstLine = section.split('\n')[0];
            const keyTitleMatch = firstLine.match(/^(task-[\w-]+):\s+(.+)$/);

            if (!keyTitleMatch) {
                continue; // Skip invalid task headers
            }

            const taskKey = keyTitleMatch[1].trim();
            const taskTitle = keyTitleMatch[2].trim();
            const taskContent = section.substring(firstLine.length);

            const task: PlanTaskDefinition = {
                key: taskKey,
                title: taskTitle,
                goal: '',
                type: 'implement',
            };

            // Parse task fields
            const goalMatch = taskContent.match(/Goal:\s*(.+?)(?:\n|$)/);
            if (goalMatch) {
                task.goal = goalMatch[1].trim();
            }

            const typeMatch = taskContent.match(/Type:\s*(research|implement|verify|docs|cleanup)/);
            if (typeMatch) {
                task.type = typeMatch[1] as PlanTaskDefinition['type'];
            }

            const contextMatch = taskContent.match(/Context:\s*([\s\S]*?)(?=\n####\s+|\Z)/i);
            if (contextMatch) {
                task.context = contextMatch[1].trim();
            }

            const timeboxMatch = taskContent.match(/Timebox:\s*(\d+)/);
            if (timeboxMatch) {
                task.timebox = parseInt(timeboxMatch[1], 10);
            }

            const riskMatch = taskContent.match(/Risk:\s*(low|medium|high)/);
            if (riskMatch) {
                task.risk = riskMatch[1] as 'low' | 'medium' | 'high';
            }

            const depsMatch = taskContent.match(/Dependencies:\s*(.+?)(?:\n|$)/);
            if (depsMatch) {
                task.dependencies = depsMatch[1]
                    .split(',')
                    .map(d => d.trim())
                    .filter(d => d);
            }

            const filesMatch = taskContent.match(/Expected Files:\s*(.+?)(?:\n|$)/);
            if (filesMatch) {
                task.expectedFiles = filesMatch[1]
                    .split(',')
                    .map(f => f.trim())
                    .filter(f => f);
            }

            // Parse subtasks
            const subtasksMatch = taskContent.match(/####\s+Subtasks\n([\s\S]*?)(?=\n####\s+|\Z)/i);
            if (subtasksMatch) {
                const subtaskLines = subtasksMatch[1].split('\n');
                task.subtasks = subtaskLines
                    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
                    .map(line => {
                        const cleaned = line.replace(/^[-*]\s*/, '').trim();
                        const colonIdx = cleaned.indexOf(':');
                        if (colonIdx > -1) {
                            const key = cleaned.substring(0, colonIdx).trim();
                            const title = cleaned.substring(colonIdx + 1).trim();
                            return {
                                key,
                                title: title || key,
                                status: 'ready' as const,
                            };
                        }
                        return {
                            key: 'sub-' + Math.random().toString(36).substr(2, 9),
                            title: cleaned,
                            status: 'ready' as const,
                        };
                    });
            }

            // Parse gates
            const gatesMatch = taskContent.match(/####\s+Gates\n([\s\S]*?)(?=\n####\s+|\Z)/i);
            if (gatesMatch) {
                task.gates = gatesMatch[1]
                    .split('\n')
                    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
                    .map(line => line.replace(/^[-*]\s*/, '').trim())
                    .filter(g => g);
            }

            plan.tasks.push(task);
        }

        if (plan.tasks.length === 0) {
            throw new ValidationError('Plan must contain at least one task (format: ### task-key: Title)');
        }

        return plan;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError(`Failed to parse plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Validates a parsed plan structure
 * 
 * @param plan Parsed plan object
 * @returns Validation result with errors and warnings
 */
export function validatePlan(plan: WorkItemPlan): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check title
    if (!plan.title || plan.title.trim().length === 0) {
        errors.push('Plan title is required');
    }

    // Check tasks exist
    if (!plan.tasks || plan.tasks.length === 0) {
        errors.push('Plan must contain at least one task');
    }

    // Collect all task keys for dependency validation
    const taskKeys = new Set(plan.tasks.map(t => t.key));

    // Validate each task
    for (const task of plan.tasks) {
        // Check required fields
        if (!task.key || task.key.trim().length === 0) {
            errors.push('All tasks must have a key');
        }

        if (!task.key.startsWith('task-')) {
            warnings.push(`Task key "${task.key}" should follow pattern "task-*"`);
        }

        if (!task.title || task.title.trim().length === 0) {
            errors.push(`Task ${task.key}: title is required`);
        }

        if (!task.goal || task.goal.trim().length === 0) {
            errors.push(`Task ${task.key}: goal is required`);
        }

        if (!task.type) {
            errors.push(`Task ${task.key}: type is required`);
        }

        // Validate type
        const validTypes = ['research', 'implement', 'verify', 'docs', 'cleanup'];
        if (task.type && !validTypes.includes(task.type)) {
            errors.push(`Task ${task.key}: invalid type "${task.type}"`);
        }

        // Check dependencies exist
        if (task.dependencies && task.dependencies.length > 0) {
            for (const depKey of task.dependencies) {
                if (!taskKeys.has(depKey)) {
                    errors.push(`Task ${task.key}: dependency "${depKey}" not found in plan`);
                }
            }
        }

        // Validate risk
        if (task.risk && !['low', 'medium', 'high'].includes(task.risk)) {
            errors.push(`Task ${task.key}: invalid risk "${task.risk}"`);
        }

        // Validate timebox
        if (task.timebox !== undefined && (task.timebox <= 0 || !Number.isInteger(task.timebox))) {
            errors.push(`Task ${task.key}: timebox must be a positive integer`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Imports a plan file for a work item, creating/updating tasks
 * 
 * @param client Authenticated Supabase client
 * @param workItemId Work item to import plan into
 * @param planText Markdown plan file content
 * @returns Import result with created/updated counts
 * @throws ValidationError if plan is invalid
 * @throws NotFoundError if work item not found
 */
export async function importPlan(
    client: SupabaseClient<Database>,
    workItemId: string,
    planText: string
): Promise<PlanImportResult> {
    try {
        // Parse plan
        const plan = parsePlan(planText);

        // Validate plan
        const validation = validatePlan(plan);
        if (!validation.valid) {
            throw new ValidationError(`Plan validation failed: ${validation.errors.join('; ')}`);
        }

        // Get work item to verify it exists and get project_id
        const workItem = await getWorkItem(client, workItemId);

        // Update work item with definition of done if provided
        if (plan.definitionOfDone) {
            await updateWorkItem(client, workItemId, {
                definition_of_done: plan.definitionOfDone,
            });
        }

        // Build a map of task keys to created task IDs for dependency resolution
        const taskKeyToId: Record<string, string> = {};

        // Get existing tasks for this work item to determine creates vs updates
        const { data: existingTasks, error: existingError } = await client
            .from('agent_tasks')
            .select('id, task_key, project_id')
            .eq('work_item_id', workItemId) as any;

        if (existingError) {
            throw mapSupabaseError(existingError);
        }

        const existingTasksByKey = new Map<string, { id: string; task_key: string | null; project_id: string }>(
            (existingTasks || [])
                .filter((t: any) => t.task_key)
                .map((t: any) => [t.task_key, t])
        );

        let tasksCreated = 0;
        let tasksUpdated = 0;

        // Process each task in the plan
        for (const planTask of plan.tasks) {
            const existingTask = existingTasksByKey.get(planTask.key);

            // Resolve dependencies - convert task keys to task IDs
            const dependsOnIds: string[] = [];
            if (planTask.dependencies && planTask.dependencies.length > 0) {
                for (const depKey of planTask.dependencies) {
                    const existingDepTask = existingTasksByKey.get(depKey);
                    const depTaskId = taskKeyToId[depKey] || (existingDepTask ? existingDepTask.id : undefined);
                    if (depTaskId) {
                        dependsOnIds.push(depTaskId);
                    }
                }
            }

            if (existingTask) {
                // Update existing task
                await updateAgentTask(client, existingTask.id, {
                    title: planTask.title,
                    goal: planTask.goal,
                    type: planTask.type,
                    context: planTask.context as string | undefined,
                    verification: undefined, // Don't override existing
                    output_expectation: undefined,
                    risk: planTask.risk,
                    timebox_minutes: planTask.timebox || 15,
                    depends_on_ids: dependsOnIds.length > 0 ? dependsOnIds : undefined,
                } as any);
                tasksUpdated++;
                taskKeyToId[planTask.key] = existingTask.id;
            } else {
                // Create new task
                const newTask = await createAgentTask(client, workItem.project_id, {
                    work_item_id: workItemId,
                    type: planTask.type,
                    title: planTask.title,
                    goal: planTask.goal,
                    context: planTask.context as string | null,
                    inputs: null,
                    output_expectation: null,
                    verification: null,
                    status: 'ready',
                    depends_on_ids: dependsOnIds,
                    risk: planTask.risk || 'low',
                    timebox_minutes: planTask.timebox || 15,
                } as any);

                // Set the task_key on the newly created task and update additional fields
                await client
                    .from('agent_tasks')
                    .update({
                        task_key: planTask.key,
                        expected_files: planTask.expectedFiles || [],
                        subtasks: planTask.subtasks || [],
                        gates: planTask.gates || [],
                    })
                    .eq('id', newTask.id);

                tasksCreated++;
                taskKeyToId[planTask.key] = newTask.id;
            }
        }

        return {
            workItemId,
            workItem,
            tasksCreated,
            tasksUpdated,
            taskMappings: Object.entries(taskKeyToId).map(([taskKey, taskId]) => ({
                taskKey,
                taskId,
            })),
        };
    } catch (error) {
        if (error instanceof Error && error.name.includes('Error')) {
            throw error;
        }
        throw mapSupabaseError(error);
    }
}

/**
 * Exports a work item's tasks as a plan file
 * 
 * @param client Authenticated Supabase client
 * @param workItemId Work item to export
 * @returns Export result with plan object and markdown content
 * @throws NotFoundError if work item not found
 */
export async function exportPlan(
    client: SupabaseClient<Database>,
    workItemId: string
): Promise<PlanExportResult> {
    try {
        // Get work item
        const workItem = await getWorkItem(client, workItemId);

        // Get all tasks for this work item
        const { data: tasks, error: tasksError } = await client
            .from('agent_tasks')
            .select('*')
            .eq('work_item_id', workItemId)
            .order('created_at', { ascending: true }) as any;

        if (tasksError) {
            throw mapSupabaseError(tasksError);
        }

        // Convert tasks to plan task definitions
        const planTasks: PlanTaskDefinition[] = (tasks || []).map((task: any) => ({
            key: task.task_key || `task-${task.id.substring(0, 8)}`,
            title: task.title,
            goal: task.goal,
            type: task.type,
            context: task.context || undefined,
            expectedFiles: task.expected_files || [],
            subtasks: task.subtasks || [],
            gates: task.gates || [],
            dependencies: task.depends_on_ids ? [] : undefined, // We'd need to resolve IDs to keys
            timebox: task.timebox_minutes || undefined,
            risk: task.risk,
        }));

        // Build plan object
        const plan: WorkItemPlan = {
            version: PLAN_FORMAT_VERSION,
            workItemId,
            title: workItem.title,
            description: workItem.description || undefined,
            definitionOfDone: workItem.definition_of_done || undefined,
            tasks: planTasks,
        };

        // Convert to markdown
        const content = planToMarkdown(plan);

        return {
            plan,
            content,
        };
    } catch (error) {
        if (error instanceof Error && error.name.includes('Error')) {
            throw error;
        }
        throw mapSupabaseError(error);
    }
}

/**
 * Converts a plan object to markdown format
 * 
 * @param plan Plan object to convert
 * @returns Markdown representation
 */
export function planToMarkdown(plan: WorkItemPlan): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${plan.title}`);
    lines.push('');

    // Description
    if (plan.description) {
        lines.push(plan.description);
        lines.push('');
    }

    // Definition of Done
    if (plan.definitionOfDone) {
        lines.push('## Definition of Done');
        lines.push('');
        lines.push(plan.definitionOfDone);
        lines.push('');
    }

    // Tasks
    lines.push('## Tasks');
    lines.push('');

    for (const task of plan.tasks) {
        lines.push(`### ${task.key}: ${task.title}`);
        lines.push('');
        lines.push(`Goal: ${task.goal}`);
        lines.push(`Type: ${task.type}`);

        if (task.timebox) {
            lines.push(`Timebox: ${task.timebox} minutes`);
        }

        if (task.risk) {
            lines.push(`Risk: ${task.risk}`);
        }

        if (task.dependencies && task.dependencies.length > 0) {
            lines.push(`Dependencies: ${task.dependencies.join(', ')}`);
        }

        if (task.expectedFiles && task.expectedFiles.length > 0) {
            lines.push(`Expected Files: ${task.expectedFiles.join(', ')}`);
        }

        if (task.context) {
            lines.push('');
            lines.push('Context:');
            lines.push(task.context);
        }

        if (task.subtasks && task.subtasks.length > 0) {
            lines.push('');
            lines.push('#### Subtasks');
            for (const subtask of task.subtasks) {
                lines.push(`- ${subtask.key}: ${subtask.title}`);
            }
        }

        if (task.gates && task.gates.length > 0) {
            lines.push('');
            lines.push('#### Gates');
            for (const gate of task.gates) {
                lines.push(`- ${gate}`);
            }
        }

        lines.push('');
    }

    return lines.join('\n');
}

