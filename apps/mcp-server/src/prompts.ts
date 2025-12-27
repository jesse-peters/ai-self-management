/**
 * MCP Prompt definitions for ProjectFlow
 * 
 * Prompts provide workflow templates that guide agents through correct task loops.
 * All prompts use the pm.* prefix for consistency.
 */

import type { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { getProject, listWorkItems, getWorkItem, listAgentTasks } from '@projectflow/core';
import type { AgentTaskWithDetails } from '@projectflow/core';
import { authenticateTool } from './toolImplementations';

/**
 * List of all available prompts
 */
export const prompts: Prompt[] = [
  {
    name: 'pm.setup_work_item',
    description: 'Setup a new work item by creating/initializing a local plan file (in ./.pm/ directory, scoped to work item), then importing it to the API',
    arguments: [
      {
        name: 'projectId',
        description: 'The project ID',
        required: true,
      },
    ],
  },
  {
    name: 'pm.continue_work_item',
    description: 'Continue working on an existing work item by reading from the plan file (in ./.pm/ directory, scoped to work item), working on tasks, updating the file, and syncing with the API as needed',
    arguments: [
      {
        name: 'workItemId',
        description: 'The work item ID to continue working on',
        required: true,
      },
    ],
  },
];

/**
 * Gets a prompt by name with populated content
 */
export async function getPrompt(
  userId: string,
  accessToken: string,
  promptName: string,
  args: Record<string, unknown>
): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  switch (promptName) {
    case 'pm.setup_work_item':
      return getSetupWorkItemPrompt(userId, accessToken, args);
    case 'pm.continue_work_item':
      return getContinueWorkItemPrompt(userId, accessToken, args);
    default:
      throw new Error(`Unknown prompt: ${promptName}`);
  }
}

/**
 * Setup work item prompt - guides through creating a new work item with plan file
 */
async function getSetupWorkItemPrompt(
  userId: string,
  accessToken: string,
  args: Record<string, unknown>
): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  const projectId = args.projectId as string;
  if (!projectId) {
    throw new Error('projectId is required for pm.setup_work_item');
  }

  // Authenticate and get Supabase client
  const { client } = await authenticateTool(accessToken, 'oauth');

  // Fetch project details
  const project = await getProject(client, projectId);
  const existingWorkItems = await listWorkItems(client, projectId);

  const promptText = `# Setup New Work Item

## Project Context
**Project:** ${project.name}
**Project ID:** ${projectId}
${project.description ? `**Description:** ${project.description}` : ''}

## Existing Work Items
${existingWorkItems.length > 0
      ? `This project has ${existingWorkItems.length} existing work item(s):\n${existingWorkItems.slice(0, 5).map(wi => `- ${wi.title} (${wi.status})`).join('\n')}`
      : 'This project has no existing work items yet.'}

## Work Item Setup Workflow

You are about to create a new work item by setting up a local plan file. This workflow uses plan files (stored in \`./.pm/\` directory) as the human-readable source of truth.

### Step 1: Gather Work Item Information

Ask the user for:
1. **Work Item Title**: A clear, concise title (e.g., "User Authentication", "Payment Integration")
2. **Description** (optional): Detailed description of what this work item covers
3. **Definition of Done** (optional): Acceptance criteria that define when the work item is complete
4. **External URL** (optional): Link to external ticket (GitHub issue, Jira ticket, etc.)

### Step 2: Create Work Item via MCP (REQUIRED FIRST)

**Before creating the plan file, you MUST create the work item in the database first:**
1. **Use \`pm.work_item_create({projectId, title, description, externalUrl})\` MCP tool** to create the work item
   - This returns the \`workItemId\` which you need for the plan file filename
   - Store the returned \`workItemId\` - you'll use it to scope the plan file name

### Step 3: Create Plan File

Once you have the \`workItemId\` from Step 2, create a plan file in the \`./.pm/\` directory:
- **Filename**: Scope the filename to the work item using the workItemId: \`./.pm/work-item-{workItemId}.md\`
- **Format**: Follow the plan file format (see reference below)

The plan file should include:
- Work item title as \`# Heading\`
- Description
- \`## Definition of Done\` section (if provided)
- \`## Tasks\` section with task definitions

### Step 4: Define Tasks in Plan File

For each task, include in the plan file:
- **Task Key**: Unique identifier (e.g., \`task-001\`, \`task-002\`, \`task-fix-auth\`)
- **Task Title**: Clear task title (format: \`### task-key: Task Title\`)
- **Goal**: One-sentence description
- **Type**: One of: research, implement, verify, docs, cleanup
- **Timebox**: Estimated time in minutes (optional)
- **Risk**: low, medium, or high (optional, default: low)
- **Dependencies**: Array of task keys this task depends on (optional)
- **Expected Files**: Array of file paths this task will modify (optional)
- **Gates**: Array of gate names (optional)
- **Context**: Additional context (optional)

Example task in plan file:
\`\`\`markdown
### task-001: Research Authentication Options
Goal: Investigate authentication libraries and approaches
Type: research
Timebox: 30
Risk: low
Dependencies: 
Expected Files: docs/auth-research.md
\`\`\`

### Step 5: Import Plan to Database

After creating the plan file:
1. Read the plan file content
2. **Use \`pm.plan_import(workItemId, planText)\` MCP tool** to import the plan to the database
   - This will create/update all tasks in the database for the existing work item
   - Use the \`workItemId\` from Step 2

## Plan File Format Reference

Plan files use markdown with this structure:

\`\`\`markdown
# Work Item Title

Description of the work item

## Definition of Done
- Acceptance criteria 1
- Acceptance criteria 2

## Tasks

### task-001: First Task Title
Goal: Clear description of what needs to be done
Type: implement
Timebox: 30
Risk: medium
Dependencies: task-002, task-003
Expected Files: src/auth.ts, src/auth.test.ts

### task-002: Research Task
Goal: Investigate the approach
Type: research
Timebox: 15
Risk: low

#### Subtasks
- sub-1: Subtask one
- sub-2: Subtask two

#### Gates
- test
- lint
\`\`\`

For full format details, see: \`packages/core/src/services/PLAN_SERVICE_README.md\`

## Important Guidelines

- **Create work item FIRST**: Always create the work item via \`pm.work_item_create\` BEFORE writing the plan file - you need the workItemId for the filename
- **Use MCP tools**: Always use \`pm.work_item_create\` and \`pm.plan_import\` - do not make direct API calls
- **File location**: Store plan files in \`./.pm/\` directory
- **Filename scoping**: Each work item has its own plan file - use \`./.pm/work-item-{workItemId}.md\` format
- **Task keys**: Use stable, unique task keys (e.g., \`task-001\`, \`task-002\`) for consistent reference
- **Dependencies**: Use task keys (not IDs) for dependencies in the plan file
- **Break down tasks**: Each task should be focused and completable independently (after dependencies)

## Available MCP Tools

- \`pm.work_item_create({projectId, title, description?, externalUrl?})\`: Create work item in database (returns workItemId) - **USE THIS FIRST**
- \`pm.plan_import(workItemId, planText)\`: Import plan file to database (creates/updates tasks for existing work item)
- \`pm.work_item_list({projectId})\`: List existing work items
- \`pm.work_item_get({workItemId})\`: Get work item details

## Workflow Summary

1. Gather work item information from user
2. **Create work item via \`pm.work_item_create\`** (get workItemId)
3. Create plan file at \`./.pm/work-item-{workItemId}.md\` with tasks
4. Import plan via \`pm.plan_import(workItemId, planText)\` to create tasks

## Getting Started

Begin by asking the user for the work item title and description. Then create the work item via \`pm.work_item_create\`, create the plan file with tasks, and import it using \`pm.plan_import\`.

Start the conversation now:`;

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: promptText,
        },
      },
    ],
  };
}

/**
 * Continue work item prompt - guides through working on an existing work item
 */
async function getContinueWorkItemPrompt(
  userId: string,
  accessToken: string,
  args: Record<string, unknown>
): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  const workItemId = args.workItemId as string;
  if (!workItemId) {
    throw new Error('workItemId is required for pm.continue_work_item');
  }

  // Authenticate and get Supabase client
  const { client } = await authenticateTool(accessToken, 'oauth');

  // Fetch work item details
  const workItem = await getWorkItem(client, workItemId);
  const project = await getProject(client, workItem.project_id);
  const tasks = await listAgentTasks(client, workItem.project_id, { workItemId });

  // Organize tasks by status
  const tasksByStatus = tasks.reduce((acc: Record<string, number>, task: AgentTaskWithDetails) => {
    const current = acc[task.status] || 0;
    acc[task.status] = current + 1;
    return acc;
  }, {} as Record<string, number>);

  const readyTasks = tasks.filter((t: AgentTaskWithDetails) => t.status === 'ready');
  const doingTasks = tasks.filter((t: AgentTaskWithDetails) => t.status === 'doing');
  const blockedTasks = tasks.filter((t: AgentTaskWithDetails) => t.status === 'blocked');
  const doneTasks = tasks.filter((t: AgentTaskWithDetails) => t.status === 'done');
  const reviewTasks = tasks.filter((t: AgentTaskWithDetails) => t.status === 'review');

  // Determine plan file path (scoped to work item)
  const planFilePath = `./.pm/work-item-${workItemId}.md`;

  const promptText = `# Continue Working on Work Item

## Work Item Overview
**Title:** ${workItem.title}
**Work Item ID:** ${workItemId}
**Status:** ${workItem.status}
${workItem.description ? `**Description:** ${workItem.description}` : ''}
${workItem.definition_of_done ? `**Definition of Done:**\n${workItem.definition_of_done}` : ''}

## Project Context
**Project:** ${project.name}
**Project ID:** ${workItem.project_id}
${project.description ? `**Description:** ${project.description}` : ''}

## Current Task Status
- **Total Tasks:** ${tasks.length}
- **Ready:** ${tasksByStatus.ready || 0}
- **Doing:** ${tasksByStatus.doing || 0}
- **Blocked:** ${tasksByStatus.blocked || 0}
- **Review:** ${tasksByStatus.review || 0}
- **Done:** ${tasksByStatus.done || 0}

## Workflow Instructions

You are continuing work on this work item. Follow this workflow:

### Step 1: Load Plan File

**Use \`pm.plan_export(workItemId)\` MCP tool** to get the current plan content from the API:
- This ensures you have the latest state from the database
- The plan file should be stored at: \`${planFilePath}\`
- You can also read the local plan file if it exists, but prefer the exported version for accuracy

### Step 2: Review Current State

Parse the plan file to understand:
- Work item details and definition of done
- All tasks and their current status
- Task dependencies (using task keys)
- Expected files for each task
- Gates that need to pass

### Step 3: Decide Which Tasks to Work On

Review available tasks and decide which to work on:
- Consider task dependencies (tasks with no dependencies or completed dependencies are ready)
- Consider task status (ready tasks are available to work on)
- Consider priorities and risk levels
- You can work on multiple tasks in sequence

**Available Tasks (Ready):**
${readyTasks.length > 0
      ? readyTasks.map((t: AgentTaskWithDetails) => {
        const deps = (t as any).depends_on_ids || [];
        const depsText = deps.length > 0 ? ` (depends on: ${deps.join(', ')})` : '';
        return `- **${t.title}** (${t.task_key || t.id})${depsText}\n  Goal: ${t.goal || 'No goal specified'}`;
      }).join('\n\n')
      : 'No ready tasks available. All tasks may be in progress, blocked, or done.'}

${doingTasks.length > 0
      ? `\n**Tasks In Progress:**\n${doingTasks.map((t: AgentTaskWithDetails) => `- ${t.title} (${t.task_key || t.id})`).join('\n')}`
      : ''}

${reviewTasks.length > 0
      ? `\n**Tasks In Review:**\n${reviewTasks.map((t: AgentTaskWithDetails) => `- ${t.title} (${t.task_key || t.id})`).join('\n')}`
      : ''}

${blockedTasks.length > 0
      ? `\n**Blocked Tasks:**\n${blockedTasks.map((t: AgentTaskWithDetails) => `- ${t.title} (${t.task_key || t.id}) - ${(t as any).blocked_reason || 'No reason specified'}`).join('\n')}`
      : ''}

### Step 4: Execute Tasks

For each task you decide to work on, follow this workflow:

1. **Assert scope before making changes:**
   - Call \`pm.assert_in_scope(taskId, changesetManifest)\` to verify your changes are within scope
   - This enforces constraints and prevents scope creep

2. **Do the work:**
   - Implement the task according to the goal and acceptance criteria
   - Make code changes, write tests, update documentation as needed
   - Stay focused on the task goal

3. **Track file changes (CRITICAL):**
   - After making any file modifications, immediately call:
     \`pm.task_record_touched_files({projectId, taskId, autoDetect: true})\`
   - This tracks which files were modified and provides an audit trail

4. **Add evidence as you work (CRITICAL):**
   - **Evidence is REQUIRED** - tasks cannot be marked done without at least 1 evidence item
   - Add evidence immediately after completing work, not at the end
   - Use \`pm.evidence_add\` with appropriate type:
     - \`type: "note"\` - For documentation, findings, summaries
     - \`type: "link"\` - For URLs, references
     - \`type: "log"\` - For command output, test results
     - \`type: "diff"\` - For code changes, file diffs

5. **Run gates:**
   - Call \`pm.gate_run({taskId, gateName})\` for each gate defined in the task
   - Address any failed gates before completing the task

6. **Update task status:**
   - Use \`pm.task_set_status({taskId, status})\` to update task status
   - Status can be: ready, doing, blocked, review, done
   - **IMPORTANT**: You cannot mark a task as "done" without evidence

7. **Update plan file:**
   - Update the local plan file (\`${planFilePath}\`) with progress:
     - Task status changes
     - Evidence notes
     - Gate results
   - Keep the plan file synchronized with the actual state

8. **Sync plan file to API:**
   - **Use \`pm.plan_import(workItemId, planText)\` MCP tool** periodically to sync plan file changes back to the API
   - This ensures the database stays in sync with your local plan file

### Step 5: Handle Blockers

If you encounter blockers:
- Ask the user for clarification or guidance
- Update task status to "blocked" with \`pm.task_set_status({taskId, status: "blocked", blockedReason: "..."})\`
- Document the blocker in the plan file
- Move to another task if possible

### Step 6: Complete Work Item

When all tasks are done:
- Verify definition of done criteria are met
- Update work item status with \`pm.work_item_set_status({workItemId, status: "done"})\`
- Final sync of plan file to API

## Important Rules

- **Use MCP tools**: Always use \`pm.plan_export\` and \`pm.plan_import\` for plan operations - do not make direct API calls
- **Plan file is source of truth**: The plan file (in \`./.pm/\` directory, scoped to work item) is the human-readable contract
- **Evidence required**: Tasks cannot be marked done without evidence
- **Track files**: Always call \`pm.task_record_touched_files\` after modifying files
- **Update plan file**: Keep the plan file updated as work progresses
- **Sync regularly**: Use \`pm.plan_import\` to sync plan file changes to the API periodically
- **Ask questions**: If you're unsure about requirements, blockers, or next steps, ask the user

## Available MCP Tools

- \`pm.plan_export(workItemId)\`: Get current plan content from API
- \`pm.plan_import(workItemId, planText)\`: Sync plan file to API
- \`pm.task_set_status({taskId, status})\`: Update task status
- \`pm.task_record_touched_files({taskId, autoDetect: true})\`: Track file changes
- \`pm.evidence_add({taskId, type, content})\`: Add evidence to tasks
- \`pm.gate_run({taskId, gateName})\`: Run gates
- \`pm.work_item_set_status({workItemId, status})\`: Update work item status
- \`pm.assert_in_scope({taskId, changesetManifest})\`: Verify changes are in scope

## Getting Started

Begin by using \`pm.plan_export(${workItemId})\` to get the current plan content. Then review the tasks and decide which to work on next.`;

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: promptText,
        },
      },
    ],
  };
}

