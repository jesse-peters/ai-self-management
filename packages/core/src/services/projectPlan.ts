/**
 * Project Plan service - handles project-level plan file parsing, validation, import/export
 * 
 * Project Plan Mode enables local plan files with stable task keys for Cursor coordination.
 * Plan files define projects as structured markdown that can be parsed and synced with the database.
 * 
 * IMPORTANT: This service uses RLS for security.
 * All functions accept an authenticated SupabaseClient.
 */

import type { Task, TaskInsert, Database, ProjectSpec } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { createTask, updateTask, listTasks } from './tasks';
import { getProject } from './projects';
import { getProjectSpec, updateProjectSpecPlanMetadata } from './projectSpecs';
import { listGates } from './gates';
import { createHash } from 'crypto';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Plan file format version
 */
const PLAN_FORMAT_VERSION = '1.0';

/**
 * Task definition from a project plan file
 */
export interface ProjectPlanTaskDefinition {
    key: string; // e.g., "PM-001", "task-001"
    title: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
    priority?: 'low' | 'medium' | 'high';
    acceptance_criteria?: string[];
    dependencies?: string[]; // References to other task keys
    gates?: string[];
}

/**
 * Project plan structure
 */
export interface ProjectPlan {
    version: string;
    projectId?: string;
    title: string;
    description?: string;
    definitionOfDone?: string;
    tasks: ProjectPlanTaskDefinition[];
    decisionPoints?: string[];
}

/**
 * Plan import result
 */
export interface ProjectPlanImportResult {
    projectId: string;
    tasksCreated: number;
    tasksUpdated: number;
    taskMappings: Array<{
        taskKey: string;
        taskId: string;
    }>;
    warnings: string[];
}

/**
 * Plan export result
 */
export interface ProjectPlanExportResult {
    plan: ProjectPlan;
    content: string; // Markdown representation with metadata
}

/**
 * Plan validation result
 */
export interface ProjectPlanValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Plan metadata for annotation
 */
export interface PlanMetadata {
    status?: string;
    evidence?: number;
    gates?: string; // e.g., "unit=passing lint=failing"
    decisions?: string[]; // Decision IDs
    last_update?: string;
}

/**
 * Parses a project plan file (markdown format) into structured plan object
 * 
 * Plan markdown format:
 * ```
 * # Project Title
 * 
 * Description of project
 * 
 * ## Definition of Done
 * - Acceptance criteria 1
 * - Acceptance criteria 2
 * 
 * ## Tasks
 * 
 * - [ ] PM-001 Task Title
 *   - ac: Acceptance criteria
 *   - deps: PM-000
 *   - gates: unit, lint
 * 
 * ## Decision Points
 * - Dependency selection for auth
 * ```
 * 
 * @param planText Markdown plan file content
 * @returns Parsed plan structure
 * @throws ValidationError if plan format is invalid
 */
export function parseProjectPlan(planText: string): ProjectPlan {
    try {
        const plan: ProjectPlan = {
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

        // Parse Decision Points
        const decisionPointsMatch = planText.match(/##\s+Decision Points\n([\s\S]*?)(?=##\s+|\Z)/i);
        if (decisionPointsMatch) {
            const decisionPointsText = decisionPointsMatch[1];
            plan.decisionPoints = decisionPointsText
                .split('\n')
                .map(line => line.replace(/^[-*]\s*/, '').trim())
                .filter(line => line.length > 0);
        }

        // Parse tasks (## Tasks section with checkbox items)
        const tasksMatch = planText.match(/##\s+Tasks\n([\s\S]*?)(?=##\s+|\Z)/i);
        if (tasksMatch) {
            const tasksSection = tasksMatch[1];
            const taskLines = tasksSection.split('\n');

            let currentTask: ProjectPlanTaskDefinition | null = null;

            for (let i = 0; i < taskLines.length; i++) {
                const line = taskLines[i];

                // Check for task checkbox: - [ ] PM-001 Title or - [ ] task-001 Title
                const taskMatch = line.match(/^[-*]\s+\[([ x])\]\s+([A-Z]+-\d+|task-[\w-]+)\s+(.+)$/);
                if (taskMatch) {
                    // Save previous task if exists
                    if (currentTask) {
                        plan.tasks.push(currentTask);
                    }

                    const checked = taskMatch[1] === 'x';
                    const taskKey = taskMatch[2].trim();
                    const taskTitle = taskMatch[3].trim();

                    currentTask = {
                        key: taskKey,
                        title: taskTitle,
                        status: checked ? 'done' : 'todo',
                    };
                } else if (currentTask) {
                    // Parse metadata lines (indented)
                    const metadataMatch = line.match(/^\s{2,}([-*]|ac:|deps:|gates:)\s*(.+)$/);
                    if (metadataMatch) {
                        const key = metadataMatch[1].trim();
                        const value = metadataMatch[2].trim();

                        if (key === 'ac:' || key === '-') {
                            // Acceptance criteria
                            if (!currentTask.acceptance_criteria) {
                                currentTask.acceptance_criteria = [];
                            }
                            currentTask.acceptance_criteria.push(value);
                        } else if (key === 'deps:') {
                            // Dependencies
                            currentTask.dependencies = value.split(',').map(d => d.trim()).filter(d => d);
                        } else if (key === 'gates:') {
                            // Gates
                            currentTask.gates = value.split(',').map(g => g.trim()).filter(g => g);
                        }
                    }
                }
            }

            // Add last task
            if (currentTask) {
                plan.tasks.push(currentTask);
            }
        }

        if (plan.tasks.length === 0) {
            throw new ValidationError('Plan must contain at least one task');
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
 * Validates a parsed project plan structure
 * 
 * @param plan Parsed plan object
 * @returns Validation result with errors and warnings
 */
export function validateProjectPlan(plan: ProjectPlan): ProjectPlanValidationResult {
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

    // Check for duplicate task keys
    const seenKeys = new Set<string>();
    for (const task of plan.tasks) {
        if (seenKeys.has(task.key)) {
            errors.push(`Duplicate task key: ${task.key}`);
        }
        seenKeys.add(task.key);
    }

    // Validate each task
    for (const task of plan.tasks) {
        // Check required fields
        if (!task.key || task.key.trim().length === 0) {
            errors.push('All tasks must have a key');
        }

        if (!task.title || task.title.trim().length === 0) {
            errors.push(`Task ${task.key}: title is required`);
        }

        // Check dependencies exist
        if (task.dependencies && task.dependencies.length > 0) {
            for (const depKey of task.dependencies) {
                if (!taskKeys.has(depKey)) {
                    errors.push(`Task ${task.key}: dependency "${depKey}" not found in plan`);
                }
            }
        }

        // Validate status
        if (task.status && !['todo', 'in_progress', 'done', 'blocked', 'cancelled'].includes(task.status)) {
            errors.push(`Task ${task.key}: invalid status "${task.status}"`);
        }

        // Validate priority
        if (task.priority && !['low', 'medium', 'high'].includes(task.priority)) {
            errors.push(`Task ${task.key}: invalid priority "${task.priority}"`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Computes hash of plan text for change detection
 */
function computePlanHash(planText: string): string {
    return createHash('sha256').update(planText).digest('hex');
}

/**
 * Imports a project plan file, creating/updating tasks
 * 
 * @param client Authenticated Supabase client
 * @param projectId Project to import plan into
 * @param planText Markdown plan file content
 * @param planPath Optional plan file path (default: ./.pm/plan.md)
 * @returns Import result with created/updated counts
 * @throws ValidationError if plan is invalid
 * @throws NotFoundError if project not found
 */
export async function importProjectPlan(
    client: SupabaseClient<Database>,
    projectId: string,
    planText: string,
    planPath: string = './.pm/plan.md'
): Promise<ProjectPlanImportResult> {
    try {
        // Parse plan
        const plan = parseProjectPlan(planText);

        // Validate plan
        const validation = validateProjectPlan(plan);
        if (!validation.valid) {
            throw new ValidationError(`Plan validation failed: ${validation.errors.join('; ')}`);
        }

        // Verify project exists
        await getProject(client, projectId);

        // Get or create project spec
        let projectSpec: ProjectSpec;
        try {
            projectSpec = await getProjectSpec(client, projectId);
        } catch (error) {
            if (error instanceof NotFoundError) {
                // Create minimal project spec if it doesn't exist
                const { data: spec, error: createError } = await client
                    .from('project_specs')
                    .insert([{
                        project_id: projectId,
                        goals: plan.description || 'Project goals',
                        definition_of_done: plan.definitionOfDone || 'Tasks completed',
                    }])
                    .select()
                    .single();

                if (createError) {
                    throw mapSupabaseError(createError);
                }
                projectSpec = spec as ProjectSpec;
            } else {
                throw error;
            }
        }

        // Update project spec with definition of done if provided
        if (plan.definitionOfDone && plan.definitionOfDone !== projectSpec.definition_of_done) {
            await client
                .from('project_specs')
                .update({ definition_of_done: plan.definitionOfDone })
                .eq('project_id', projectId);
        }

        // Build a map of task keys to created task IDs for dependency resolution
        const taskKeyToId: Record<string, string> = {};

        // Get existing tasks for this project
        const existingTasks = await listTasks(client, projectId);

        // Build map of existing tasks by plan key (stored in constraints.plan_key)
        const existingTasksByKey = new Map<string, Task>();
        for (const task of existingTasks) {
            const constraints = (task as any).constraints as any;
            if (constraints && constraints.plan_key) {
                existingTasksByKey.set(constraints.plan_key, task);
            }
        }

        // Get project gates for validation
        const { data: { user } } = await client.auth.getUser();
        const userId = user?.id;
        if (!userId) {
            throw new ValidationError('User must be authenticated');
        }
        const gates = await listGates(userId, projectId, client);
        const gateNames = new Set(gates.map(g => g.name));

        let tasksCreated = 0;
        let tasksUpdated = 0;
        const warnings: string[] = [];

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
                    } else {
                        warnings.push(`Task ${planTask.key}: dependency "${depKey}" not found`);
                    }
                }
            }

            // Validate gates
            if (planTask.gates && planTask.gates.length > 0) {
                for (const gateName of planTask.gates) {
                    if (!gateNames.has(gateName)) {
                        warnings.push(`Task ${planTask.key}: gate "${gateName}" not found in project`);
                    }
                }
            }

            // Prepare task data
            const taskData: any = {
                title: planTask.title,
                description: planTask.description || null,
                status: planTask.status || 'todo',
                priority: planTask.priority || null,
                acceptance_criteria: planTask.acceptance_criteria || [],
                dependencies: dependsOnIds,
                constraints: {
                    plan_key: planTask.key,
                    gates: planTask.gates || [],
                },
            };

            if (existingTask) {
                // Update existing task
                await updateTask(client, existingTask.id, taskData);
                tasksUpdated++;
                taskKeyToId[planTask.key] = existingTask.id;
            } else {
                // Create new task
                const newTask = await createTask(client, projectId, taskData);
                tasksCreated++;
                taskKeyToId[planTask.key] = newTask.id;
            }
        }

        // Update project spec with plan metadata
        const planHash = computePlanHash(planText);
        await updateProjectSpecPlanMetadata(
            client,
            projectId,
            planPath,
            planHash,
            new Date().toISOString(),
            undefined
        );

        return {
            projectId,
            tasksCreated,
            tasksUpdated,
            taskMappings: Object.entries(taskKeyToId).map(([taskKey, taskId]) => ({
                taskKey,
                taskId,
            })),
            warnings,
        };
    } catch (error) {
        if (error instanceof Error && error.name.includes('Error')) {
            throw error;
        }
        throw mapSupabaseError(error);
    }
}

/**
 * Exports a project's tasks as a plan file with metadata annotations
 * 
 * @param client Authenticated Supabase client
 * @param projectId Project to export
 * @returns Export result with plan object and markdown content
 * @throws NotFoundError if project not found
 */
export async function exportProjectPlan(
    client: SupabaseClient<Database>,
    projectId: string
): Promise<ProjectPlanExportResult> {
    try {
        // Verify project exists
        const project = await getProject(client, projectId);

        // Get project spec
        let projectSpec: ProjectSpec | null = null;
        try {
            projectSpec = await getProjectSpec(client, projectId);
        } catch (error) {
            // Project spec may not exist, that's okay
        }

        // Get all tasks for this project
        const tasks = await listTasks(client, projectId);

        // Get user ID for queries
        const { data: { user } } = await client.auth.getUser();
        const userId = user?.id;
        if (!userId) {
            throw new ValidationError('User must be authenticated');
        }

        // Get gates for gate status
        const gates = await listGates(userId, projectId, client);
        const gatesById = new Map(gates.map(g => [g.id, g]));
        const gatesByName = new Map(gates.map(g => [g.name, g]));

        // Build task key to task mapping
        const tasksByKey = new Map<string, Task>();
        const taskMetadata = new Map<string, {
            evidenceCount: number;
            gateStatuses: Map<string, 'passing' | 'failing' | 'never_run'>;
            decisionIds: string[];
            lastUpdate: string;
        }>();

        for (const task of tasks) {
            const constraints = (task as any).constraints as any;
            const planKey = constraints?.plan_key;
            if (planKey) {
                tasksByKey.set(planKey, task);

                // Get evidence count
                const { count: evidenceCount } = await client
                    .from('evidence')
                    .select('id', { count: 'exact', head: true })
                    .eq('task_id', task.id)
                    .eq('user_id', userId) as any;

                // Get gate runs for this task
                const { data: gateRuns } = await client
                    .from('gate_runs')
                    .select('gate_id, status, created_at')
                    .eq('task_id', task.id)
                    .order('created_at', { ascending: false }) as any;

                const gateStatuses = new Map<string, 'passing' | 'failing' | 'never_run'>();
                if (gateRuns) {
                    const latestRunsByGate = new Map<string, any>();
                    for (const run of gateRuns) {
                        if (!latestRunsByGate.has(run.gate_id)) {
                            latestRunsByGate.set(run.gate_id, run);
                        }
                    }
                    for (const [gateId, run] of latestRunsByGate) {
                        const gate = gatesById.get(gateId);
                        if (gate) {
                            gateStatuses.set(gate.name, run.status === 'passing' ? 'passing' : 'failing');
                        }
                    }
                }

                // Get decisions linked to this task (decisions don't have task_id, so we'll search by title/keywords)
                // For now, we'll just get recent decisions for the project
                const { data: decisions } = await client
                    .from('decisions')
                    .select('id')
                    .eq('project_id', projectId)
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(10) as any;

                taskMetadata.set(planKey, {
                    evidenceCount: evidenceCount || 0,
                    gateStatuses,
                    decisionIds: (decisions || []).map((d: any) => d.id),
                    lastUpdate: task.updated_at,
                });
            }
        }

        // Convert tasks to plan task definitions
        const planTasks: ProjectPlanTaskDefinition[] = Array.from(tasksByKey.entries()).map(([key, task]) => {
            const constraints = (task as any).constraints as any;
            const gates = constraints?.gates || [];

            return {
                key,
                title: task.title,
                description: task.description || undefined,
                status: task.status as any,
                priority: task.priority as any,
                acceptance_criteria: (task as any).acceptance_criteria || [],
                dependencies: (task as any).dependencies ? [] : undefined, // Would need to resolve IDs to keys
                gates: gates.length > 0 ? gates : undefined,
            };
        });

        // Build plan object
        const plan: ProjectPlan = {
            version: PLAN_FORMAT_VERSION,
            projectId,
            title: project.name,
            description: project.description || undefined,
            definitionOfDone: projectSpec?.definition_of_done || undefined,
            tasks: planTasks,
        };

        // Convert to markdown with metadata
        const content = projectPlanToMarkdown(plan, taskMetadata, gatesByName);

        // Update project spec with export timestamp
        const planHash = computePlanHash(content);
        await updateProjectSpecPlanMetadata(
            client,
            projectId,
            undefined,
            planHash,
            undefined,
            new Date().toISOString()
        );

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
 * Converts a project plan object to markdown format with metadata annotations
 * 
 * @param plan Plan object to convert
 * @param taskMetadata Metadata for each task (evidence, gates, decisions)
 * @param gatesByName Map of gate names to gate objects
 * @returns Markdown representation with HTML comment metadata blocks
 */
function projectPlanToMarkdown(
    plan: ProjectPlan,
    taskMetadata: Map<string, {
        evidenceCount: number;
        gateStatuses: Map<string, 'passing' | 'failing' | 'never_run'>;
        decisionIds: string[];
        lastUpdate: string;
    }>,
    gatesByName: Map<string, any>
): string {
    const lines: string[] = [];

    // Add status summary block at top
    lines.push('<!-- PM:status');
    lines.push('overall_health: healthy');
    lines.push('blockers: 0');
    lines.push(`last_export: ${new Date().toISOString()}`);
    lines.push('-->');
    lines.push('');

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

    // Decision Points
    if (plan.decisionPoints && plan.decisionPoints.length > 0) {
        lines.push('## Decision Points');
        lines.push('');
        for (const point of plan.decisionPoints) {
            lines.push(`- ${point}`);
        }
        lines.push('');
    }

    // Tasks
    lines.push('## Tasks');
    lines.push('');

    for (const task of plan.tasks) {
        const metadata = taskMetadata.get(task.key);
        const checkbox = task.status === 'done' ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} ${task.key} ${task.title}`);

        // Add acceptance criteria
        if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
            for (const ac of task.acceptance_criteria) {
                lines.push(`  - ac: ${ac}`);
            }
        }

        // Add dependencies
        if (task.dependencies && task.dependencies.length > 0) {
            lines.push(`  - deps: ${task.dependencies.join(', ')}`);
        }

        // Add gates
        if (task.gates && task.gates.length > 0) {
            lines.push(`  - gates: ${task.gates.join(', ')}`);
        }

        // Add metadata block
        if (metadata) {
            lines.push('  <!-- PM:meta');
            lines.push(`  status: ${task.status || 'todo'}`);
            lines.push(`  evidence: ${metadata.evidenceCount}`);

            // Format gate statuses
            const gateStatusStrings: string[] = [];
            for (const [gateName, status] of metadata.gateStatuses) {
                gateStatusStrings.push(`${gateName}=${status}`);
            }
            if (gateStatusStrings.length > 0) {
                lines.push(`  gates: ${gateStatusStrings.join(' ')}`);
            }

            if (metadata.decisionIds.length > 0) {
                lines.push(`  decisions: ${metadata.decisionIds.join(', ')}`);
            }

            lines.push(`  last_update: ${metadata.lastUpdate}`);
            lines.push('  -->');
        }

        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Adds or updates plan metadata in existing plan text
 * 
 * @param planText Existing plan markdown
 * @param taskKey Task key to add metadata for
 * @param metadata Metadata to add
 * @returns Updated plan text with metadata
 */
export function addPlanMetadata(
    planText: string,
    taskKey: string,
    metadata: PlanMetadata
): string {
    // Find the task line
    const taskPattern = new RegExp(`(^[-*]\\s+\\[[ x]\\]\\s+${taskKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+[^\\n]+)`, 'm');
    const match = planText.match(taskPattern);

    if (!match) {
        return planText; // Task not found, return as-is
    }

    const taskLine = match[1];
    const taskLineIndex = planText.indexOf(taskLine);

    // Find where the task section ends (next task or next ## heading)
    const afterTaskLine = planText.substring(taskLineIndex + taskLine.length);
    const nextTaskMatch = afterTaskLine.match(/^[-*]\s+\[[ x]\]\s+/m);
    const nextHeadingMatch = afterTaskLine.match(/^##\s+/m);

    let sectionEnd = planText.length;
    if (nextTaskMatch && nextTaskMatch.index !== undefined) {
        sectionEnd = taskLineIndex + taskLine.length + nextTaskMatch.index;
    } else if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
        sectionEnd = taskLineIndex + taskLine.length + nextHeadingMatch.index;
    }

    // Check if metadata block already exists
    const section = planText.substring(taskLineIndex, sectionEnd);
    const metadataBlockMatch = section.match(/<!--\s*PM:meta[\s\S]*?-->/);

    const metadataLines: string[] = [];
    metadataLines.push('  <!-- PM:meta');
    if (metadata.status) {
        metadataLines.push(`  status: ${metadata.status}`);
    }
    if (metadata.evidence !== undefined) {
        metadataLines.push(`  evidence: ${metadata.evidence}`);
    }
    if (metadata.gates) {
        metadataLines.push(`  gates: ${metadata.gates}`);
    }
    if (metadata.decisions && metadata.decisions.length > 0) {
        metadataLines.push(`  decisions: ${metadata.decisions.join(', ')}`);
    }
    if (metadata.last_update) {
        metadataLines.push(`  last_update: ${metadata.last_update}`);
    }
    metadataLines.push('  -->');

    const newMetadataBlock = metadataLines.join('\n') + '\n';

    if (metadataBlockMatch) {
        // Replace existing metadata block
        return planText.replace(/<!--\s*PM:meta[\s\S]*?-->/m, newMetadataBlock.trim());
    } else {
        // Insert metadata block after task line
        const beforeTask = planText.substring(0, taskLineIndex + taskLine.length);
        const afterTask = planText.substring(taskLineIndex + taskLine.length);
        return beforeTask + '\n' + newMetadataBlock + afterTask;
    }
}

/**
 * Generates a project plan template
 * 
 * @param projectId Project ID
 * @param client Authenticated Supabase client
 * @returns Plan template markdown
 */
export async function generateProjectPlanTemplate(
    client: SupabaseClient<Database>,
    projectId: string
): Promise<string> {
    try {
        const project = await getProject(client, projectId);
        let projectSpec: ProjectSpec | null = null;
        try {
            projectSpec = await getProjectSpec(client, projectId);
        } catch (error) {
            // Project spec may not exist
        }

        const lines: string[] = [];
        lines.push(`# ${project.name}`);
        lines.push('');

        if (project.description) {
            lines.push(project.description);
            lines.push('');
        }

        if (projectSpec?.definition_of_done) {
            lines.push('## Definition of Done');
            lines.push('');
            lines.push(projectSpec.definition_of_done);
            lines.push('');
        }

        lines.push('## Tasks');
        lines.push('');
        lines.push('- [ ] PM-001 First task');
        lines.push('  - ac: Acceptance criteria');
        lines.push('  - gates: unit, lint');
        lines.push('');

        return lines.join('\n');
    } catch (error) {
        if (error instanceof Error && error.name.includes('Error')) {
            throw error;
        }
        throw mapSupabaseError(error);
    }
}

