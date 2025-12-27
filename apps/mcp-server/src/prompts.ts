/**
 * MCP Prompt definitions for ProjectFlow
 * 
 * Prompts provide workflow templates that guide agents through correct task loops.
 * All prompts use the pm.* prefix for consistency.
 */

import type { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { resolveUserId } from './auth';
import { getTask, listTasks } from '@projectflow/core';
import { getCheckpoint, listCheckpoints } from '@projectflow/core';
import { getProject, listWorkItems } from '@projectflow/core';
import { listArtifacts } from '@projectflow/core';
import { evaluateGates } from '@projectflow/core';
import { getTaskEvents } from '@projectflow/core';
import { getProjectEvents } from '@projectflow/core';
import type { Task, Artifact, LegacyGateResult, Event, Checkpoint } from '@projectflow/core';
import { authenticateTool } from './toolImplementations';

/**
 * List of all available prompts
 */
export const prompts: Prompt[] = [
  {
    name: 'pm.task_focus_mode',
    description: 'Enter focus mode for a task - restates criteria and guides through work → artifacts → gates → checkpoint loop',
    arguments: [
      {
        name: 'taskId',
        description: 'The task ID to focus on',
        required: true,
      },
    ],
  },
  {
    name: 'pm.resume_from_checkpoint',
    description: 'Resume work from a checkpoint - loads checkpoint context and presents resume instructions',
    arguments: [
      {
        name: 'checkpointId',
        description: 'The checkpoint ID to resume from',
        required: true,
      },
    ],
  },
  {
    name: 'pm.propose_tasks_from_goal',
    description: 'Generate task breakdown from a high-level goal - applies project constraints and returns proposed tasks for human approval',
    arguments: [
      {
        name: 'projectId',
        description: 'The project ID',
        required: true,
      },
      {
        name: 'goal',
        description: 'High-level goal description',
        required: true,
      },
      {
        name: 'constraints',
        description: 'Optional constraints (JSON string)',
        required: false,
      },
    ],
  },
  {
    name: 'pm.write_status_update',
    description: 'Generate human-readable status report - summarizes recent events, completed tasks, blockers, and lists next tasks',
    arguments: [
      {
        name: 'projectId',
        description: 'The project ID',
        required: true,
      },
    ],
  },
  {
    name: 'pm.work_item',
    description: 'Create a new work item with tasks - guides through interactive setup of work item and task structure with dependencies to establish timeline',
    arguments: [
      {
        name: 'projectId',
        description: 'The project ID',
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
    case 'pm.task_focus_mode':
      return getTaskFocusModePrompt(userId, accessToken, args);
    case 'pm.resume_from_checkpoint':
      return getResumeFromCheckpointPrompt(userId, accessToken, args);
    case 'pm.propose_tasks_from_goal':
      return getProposeTasksFromGoalPrompt(userId, accessToken, args);
    case 'pm.write_status_update':
      return getWriteStatusUpdatePrompt(userId, accessToken, args);
    case 'pm.work_item':
      return getWorkItemPrompt(userId, accessToken, args);
    default:
      throw new Error(`Unknown prompt: ${promptName}`);
  }
}

/**
 * Task focus mode prompt - guides agent through task execution
 */
async function getTaskFocusModePrompt(
  userId: string,
  accessToken: string,
  args: Record<string, unknown>
): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  const taskId = args.taskId as string;
  if (!taskId) {
    throw new Error('taskId is required for pm.task_focus_mode');
  }

  // Authenticate and get Supabase client
  const { client } = await authenticateTool(accessToken, 'oauth');

  // Fetch task details
  const task = await getTask(client, taskId);
  const artifacts = await listArtifacts(client, taskId);
  const gateResults = await evaluateGates(client, taskId);
  const taskEvents = await getTaskEvents(taskId);

  // Build acceptance criteria list
  const acceptanceCriteria = (task as any).acceptance_criteria || [];
  const criteriaList = acceptanceCriteria.length > 0
    ? acceptanceCriteria.map((c: string, i: number) => `  ${i + 1}. ${c}`).join('\n')
    : '  (No acceptance criteria defined)';

  // Build constraints info
  const constraints = (task as any).constraints || {};
  const constraintsText = Object.keys(constraints).length > 0
    ? `\nConstraints:\n${JSON.stringify(constraints, null, 2)}`
    : '\nConstraints: None specified';

  // Build artifacts summary
  const artifactsByType = artifacts.reduce((acc: Record<string, number>, art: Artifact) => {
    acc[art.type] = (acc[art.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const artifactsSummary = Object.keys(artifactsByType).length > 0
    ? Object.entries(artifactsByType)
      .map(([type, count]) => `  - ${type}: ${count}`)
      .join('\n')
    : '  (No artifacts yet)';

  // Build gate status
  const passedGates = gateResults.filter((g: LegacyGateResult) => g.passed);
  const failedGates = gateResults.filter((g: LegacyGateResult) => !g.passed);
  const gateStatus = gateResults.length > 0
    ? `\nGate Status:\n  Passed: ${passedGates.length}/${gateResults.length}\n${failedGates.length > 0 ? `  Failed:\n${failedGates.map((g: LegacyGateResult) => `    - ${g.gate.type}: ${g.reason || 'Not met'}`).join('\n')}` : ''}`
    : '\nGate Status: No gates configured';

  const promptText = `# Task Focus Mode: ${task.title}

## Task Overview
**Task ID:** ${task.id}
**Status:** ${task.status}
**Priority:** ${(task as any).priority || 'Not set'}
**Description:** ${task.description || 'No description provided'}

## Acceptance Criteria
${criteriaList}
${constraintsText}

## Current Progress
**Artifacts Produced:**
${artifactsSummary}
${gateStatus}

## Workflow Instructions

You are now in **focus mode** for this task. Follow this workflow:

1. **Before making any code changes:**
   - Call pm.assert_in_scope(taskId, changesetManifest) to verify your changes are within scope
   - This enforces the "leash" constraints and prevents scope creep

2. **Do the work:**
   - Implement the task according to the acceptance criteria
   - Make code changes, write tests, update documentation as needed
   - Stay focused on this task only - do not work on other tasks

3. **Record file changes (CRITICAL):**
   - After making any file modifications, immediately call:
     \`pm.task_record_touched_files({projectId, taskId, autoDetect: true})\`
   - This tracks which files were modified and provides an audit trail
   - The \`autoDetect: true\` option automatically detects changes using git diff

4. **Add evidence as you work (CRITICAL):**
   - **Evidence is REQUIRED** - tasks cannot be marked done without at least 1 evidence item
   - Add evidence immediately after completing work, not at the end
   - Use \`pm.evidence_add\` with appropriate type:
     - \`type: "note"\` - For documentation, findings, summaries (e.g., "Created analysis document")
     - \`type: "link"\` - For URLs, references (e.g., documentation links)
     - \`type: "log"\` - For command output, test results
     - \`type: "diff"\` - For code changes, file diffs
   - Example: After creating a file, immediately add evidence:
     \`pm.evidence_add({projectId, taskId, type: "note", content: "Created TOOL_USAGE_ANALYSIS.md with complete inventory"})\`

5. **Record artifacts:**
   - After making changes, call pm.append_artifact(taskId, {type, ref, summary}) for each output:
     - diff: Code changes (file paths, commit refs)
     - pr: Pull request URLs
     - test_report: Test results
     - document: Documentation updates
     - other: Any other relevant outputs

6. **Evaluate gates:**
   - Call pm.evaluate_gates(taskId) to check if quality gates pass
   - Address any failed gates before completing the task

7. **Complete the task:**
   - **IMPORTANT**: You cannot mark a task as "done" without evidence
   - Verify you have at least 1 evidence item (check with pm.task_get)
   - Once all gates pass, evidence is added, and artifacts are recorded, call pm.complete_task(taskId)
   - This will verify gates, check artifacts, verify evidence exists, and mark the task as done

8. **Create checkpoint (optional but recommended):**
   - After completing the task, consider calling pm.create_checkpoint(projectId, ...) to save progress
   - This enables resumable sessions and provides a clear state snapshot

## Important Rules
- **Stay on task**: Only work on this specific task. Do not start other tasks.
- **Enforce scope**: Always call pm.assert_in_scope before applying edits.
- **Track files**: Always call pm.task_record_touched_files after modifying files.
- **Add evidence**: Add evidence immediately after work, not at the end. Tasks require evidence to be marked done.
- **Quality gates**: Tasks cannot be completed unless gates pass.
- **Artifacts required**: Tasks need artifacts to be considered complete.
- **Evidence required**: Tasks cannot be marked done without at least 1 evidence item.

## Evidence-First Workflow Pattern

**✅ CORRECT Pattern:**
1. Do work (create/modify files)
2. Track files → \`pm.task_record_touched_files({autoDetect: true})\`
3. Add evidence → \`pm.evidence_add({type: "note", content: "..."})\`
4. Mark done → \`pm.task_set_status({status: "done"})\` (succeeds because evidence exists)

**❌ INCORRECT Pattern:**
1. Do work
2. Try to mark done → \`pm.task_set_status({status: "done"})\` (FAILS - no evidence)
3. Add evidence (too late, already tried to complete)

## Task Context
**Project ID:** ${task.project_id}
**Created:** ${new Date(task.created_at).toLocaleString()}
**Last Updated:** ${new Date((task as any).updated_at || task.created_at).toLocaleString()}
**Recent Events:** ${taskEvents.length} events recorded

Begin working on this task now. Remember to assert scope before making changes!`;

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
 * Resume from checkpoint prompt - loads checkpoint context
 */
async function getResumeFromCheckpointPrompt(
  userId: string,
  accessToken: string,
  args: Record<string, unknown>
): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  const checkpointId = args.checkpointId as string;
  if (!checkpointId) {
    throw new Error('checkpointId is required for pm.resume_from_checkpoint');
  }

  // Authenticate and get Supabase client
  const { client } = await authenticateTool(accessToken, 'oauth');

  // Fetch checkpoint details
  const checkpoint = await getCheckpoint(userId, checkpointId);
  const project = await getProject(client, checkpoint.project_id);
  const tasks = await listTasks(client, checkpoint.project_id, {});
  const snapshot = (checkpoint as any).snapshot || {};

  // Get next available tasks
  const todoTasks = tasks.filter((t: Task) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t: Task) => t.status === 'in_progress');
  const blockedTasks = tasks.filter((t: Task) => t.status === 'blocked');

  const promptText = `# Resume Work from Checkpoint

## Checkpoint Information
**Label:** ${checkpoint.label}
**Created:** ${new Date(checkpoint.created_at).toLocaleString()}
**Git Reference:** ${(checkpoint as any).repo_ref || 'Not specified'}

## Project Summary
${checkpoint.summary}

## Resume Instructions
${(checkpoint as any).resume_instructions || 'No specific resume instructions provided. Review the project state and continue from where you left off.'}

## Project State
**Project:** ${project.name}
**Project ID:** ${project.id}
${project.description ? `**Description:** ${project.description}` : ''}

## Task Status
- **Todo:** ${todoTasks.length} tasks
- **In Progress:** ${inProgressTasks.length} tasks
- **Blocked:** ${blockedTasks.length} tasks
- **Done:** ${tasks.filter((t: Task) => t.status === 'done').length} tasks

## Suggested Next Steps

1. **Review the checkpoint snapshot** to understand the state at this point
2. **Check for active tasks:**
   ${inProgressTasks.length > 0
      ? inProgressTasks.map((t: Task) => `   - ${t.title} (ID: ${t.id})`).join('\n')
      : '   - No tasks currently in progress'}
3. **Pick the next task:**
   - Use pm.pick_next_task(projectId) to get the next available task
   - Or use pm.list_tasks(projectId, {status: 'todo'}) to see all available tasks
4. **Enter focus mode:**
   - Once you have a task, use pm.task_focus_mode(taskId) to enter focus mode
5. **Continue work:**
   - Follow the task focus mode workflow
   - Create new checkpoints as you make progress

## Available Tasks
${todoTasks.length > 0
      ? todoTasks.slice(0, 10).map((t: Task) => `- **${t.title}** (ID: ${t.id})\n  ${t.description || 'No description'}`).join('\n\n')
      : 'No tasks available. Consider creating new tasks with pm.create_task.'}

${blockedTasks.length > 0
      ? `\n## Blocked Tasks (may need attention)\n${blockedTasks.map((t: Task) => `- ${t.title} (ID: ${t.id})`).join('\n')}`
      : ''}

## Project Rules
${(project as any).rules ? `\n${'```'}json\n${JSON.stringify((project as any).rules, null, 2)}\n${'```'}` : 'No project rules defined.'}

Ready to resume work. Pick a task and enter focus mode to continue!`;

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
 * Propose tasks from goal prompt - generates task breakdown
 */
async function getProposeTasksFromGoalPrompt(
  userId: string,
  accessToken: string,
  args: Record<string, unknown>
): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  const projectId = args.projectId as string;
  const goal = args.goal as string;
  const constraintsStr = args.constraints as string | undefined;

  if (!projectId) {
    throw new Error('projectId is required for pm.propose_tasks_from_goal');
  }
  if (!goal) {
    throw new Error('goal is required for pm.propose_tasks_from_goal');
  }

  // Authenticate and get Supabase client
  const { client } = await authenticateTool(accessToken, 'oauth');

  // Fetch project details
  const project = await getProject(client, projectId);
  const existingTasks = await listTasks(client, projectId, {});
  const projectRules = (project as any).rules || {};

  // Parse constraints if provided
  let constraints = {};
  if (constraintsStr) {
    try {
      constraints = JSON.parse(constraintsStr);
    } catch (e) {
      // Ignore parse errors, use empty object
    }
  }

  const promptText = `# Propose Tasks from Goal

## Goal
${goal}

## Project Context
**Project:** ${project.name}
**Project ID:** ${project.id}
${project.description ? `**Description:** ${project.description}` : ''}

## Project Rules & Constraints
${Object.keys(projectRules).length > 0
      ? `\n${'```'}json\n${JSON.stringify(projectRules, null, 2)}\n${'```'}`
      : 'No project rules defined.'}

${Object.keys(constraints).length > 0
      ? `\n## Additional Constraints\n${'```'}json\n${JSON.stringify(constraints, null, 2)}\n${'```'}`
      : ''}

## Existing Tasks
${existingTasks.length > 0
      ? `This project already has ${existingTasks.length} task(s). Consider dependencies and avoid duplication.\n\nExisting tasks:\n${existingTasks.slice(0, 10).map((t: Task) => `- ${t.title} (${t.status})`).join('\n')}`
      : 'This is a new project with no existing tasks.'}

## Task Breakdown Instructions

Analyze the goal and break it down into actionable tasks. For each proposed task, provide:

1. **Title**: Clear, concise task title
2. **Description**: Detailed description of what needs to be done
3. **Acceptance Criteria**: List of specific, testable criteria (array of strings)
4. **Constraints**: Task-specific constraints (allowedPaths, forbiddenPaths, maxFiles, etc.)
5. **Dependencies**: Array of task IDs this task depends on (if any)
6. **Priority**: low, medium, or high

## Task Proposal Format

Propose tasks in this format (you can propose multiple tasks):

${'```'}json
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "constraints": {
        "allowedPaths": ["path/to/allowed"],
        "forbiddenPaths": ["path/to/avoid"]
      },
      "dependencies": [],
      "priority": "medium"
    }
  ]
}
${'```'}

## Guidelines

- Break down the goal into small, focused tasks
- Each task should be completable independently (after dependencies)
- Consider project rules and constraints when defining task constraints
- Set appropriate priorities based on importance
- Define clear acceptance criteria that can be verified
- Consider dependencies between tasks

After proposing tasks, the human will review and approve them. Once approved, use pm.create_task to create each task in the project.

Generate the task breakdown now:`;

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
 * Write status update prompt - generates human-readable status report
 */
async function getWriteStatusUpdatePrompt(
  userId: string,
  accessToken: string,
  args: Record<string, unknown>
): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  const projectId = args.projectId as string;
  if (!projectId) {
    throw new Error('projectId is required for pm.write_status_update');
  }

  // Authenticate and get Supabase client
  const { client } = await authenticateTool(accessToken, 'oauth');

  // Fetch project data
  const project = await getProject(client, projectId);
  const tasks = await listTasks(client, projectId, {});
  const events = await getProjectEvents(projectId);
  const checkpoints = await listCheckpoints(userId, projectId);

  // Organize tasks by status
  const tasksByStatus = tasks.reduce((acc: Record<string, number>, task: Task) => {
    const current = acc[task.status] || 0;
    acc[task.status] = current + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get recent events (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentEvents = events.filter((e: Event) => new Date(e.created_at) > oneDayAgo);

  // Get active tasks
  const activeTasks = tasks.filter((t: Task) => t.status === 'in_progress' || (t as any).locked_at);
  const blockedTasks = tasks.filter((t: Task) => t.status === 'blocked');
  const completedTasks = tasks.filter((t: Task) => t.status === 'done');
  const todoTasks = tasks.filter((t: Task) => t.status === 'todo');

  // Get latest checkpoint
  const latestCheckpoint = checkpoints.length > 0 ? checkpoints[0] : null;

  const promptText = `# Generate Status Update for Project

## Project Information
**Project:** ${project.name}
**Project ID:** ${project.id}
${project.description ? `**Description:** ${project.description}` : ''}

## Current State Summary

### Task Overview
- **Total Tasks:** ${tasks.length}
- **Todo:** ${tasksByStatus.todo || 0}
- **In Progress:** ${tasksByStatus.in_progress || 0}
- **Blocked:** ${tasksByStatus.blocked || 0}
- **Done:** ${tasksByStatus.done || 0}
- **Cancelled:** ${tasksByStatus.cancelled || 0}

### Recent Activity
- **Events in last 24 hours:** ${recentEvents.length}
- **Latest Checkpoint:** ${latestCheckpoint ? latestCheckpoint.label : 'None'}

## Detailed Information

### Active Tasks (In Progress)
${activeTasks.length > 0
      ? activeTasks.map((t: Task) => {
        const lockedInfo = (t as any).locked_at ? ` (Locked since ${new Date((t as any).locked_at).toLocaleString()})` : '';
        return `- **${t.title}** (ID: ${t.id})${lockedInfo}\n  ${t.description || 'No description'}`;
      }).join('\n\n')
      : 'No tasks currently in progress.'}

### Blocked Tasks
${blockedTasks.length > 0
      ? blockedTasks.map((t: Task) => `- **${t.title}** (ID: ${t.id})\n  ${t.description || 'No description'}`).join('\n\n')
      : 'No blocked tasks.'}

### Recently Completed Tasks
${completedTasks.slice(0, 5).length > 0
      ? completedTasks
        .slice(0, 5)
        .sort((a: Task, b: Task) => new Date((b as any).updated_at || b.created_at).getTime() - new Date((a as any).updated_at || a.created_at).getTime())
        .map((t: Task) => `- **${t.title}** (ID: ${t.id})`).join('\n')
      : 'No completed tasks yet.'}

### Next Available Tasks
${todoTasks.length > 0
      ? todoTasks.slice(0, 5).map((t: Task) => `- **${t.title}** (ID: ${t.id})`).join('\n')
      : 'No tasks available.'}

### Recent Events
${recentEvents.length > 0
      ? recentEvents
        .slice(0, 10)
        .map((e: Event) => `- **${e.event_type}** at ${new Date(e.created_at).toLocaleString()}${e.task_id ? ` (Task: ${e.task_id})` : ''}`)
        .join('\n')
      : 'No recent events.'}

### Checkpoints
${checkpoints.length > 0
      ? checkpoints.slice(0, 3).map((c: Checkpoint) => `- **${c.label}** - ${new Date(c.created_at).toLocaleString()}`).join('\n')
      : 'No checkpoints created yet.'}

## Instructions

Generate a human-readable status update report for this project. The report should:

1. **Executive Summary**: Brief overview of project status (2-3 sentences)
2. **Progress Update**: What's been accomplished recently
3. **Current Focus**: What's being worked on now
4. **Blockers**: Any issues or blockers that need attention
5. **Next Steps**: Recommended next actions
6. **Metrics**: Key numbers (tasks completed, in progress, etc.)

Write the status update in a clear, professional format that a human project manager would understand. Use markdown formatting for readability.

Generate the status update now:`;

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
 * Work item creation prompt - guides through interactive work item and task setup
 */
async function getWorkItemPrompt(
  userId: string,
  accessToken: string,
  args: Record<string, unknown>
): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  const projectId = args.projectId as string;
  if (!projectId) {
    throw new Error('projectId is required for pm.work_item');
  }

  // Authenticate and get Supabase client
  const { client } = await authenticateTool(accessToken, 'oauth');

  // Fetch project details
  const project = await getProject(client, projectId);
  const existingWorkItems = await listWorkItems(client, projectId);

  const promptText = `# Create New Work Item with Tasks

## Project Context
**Project:** ${project.name}
**Project ID:** ${projectId}
${project.description ? `**Description:** ${project.description}` : ''}

## Existing Work Items
${existingWorkItems.length > 0
      ? `This project has ${existingWorkItems.length} existing work item(s):\n${existingWorkItems.slice(0, 5).map(wi => `- ${wi.title} (${wi.status})`).join('\n')}`
      : 'This project has no existing work items yet.'}

## Work Item Creation Workflow

You are about to create a new work item with associated tasks. This will establish a structured timeline through task dependencies.

### Step 1: Gather Work Item Information

First, ask the user for:
1. **Work Item Title**: A clear, concise title (e.g., "User Authentication", "Payment Integration")
2. **Description** (optional): Detailed description of what this work item covers
3. **External URL** (optional): Link to external ticket (GitHub issue, Jira ticket, etc.)

### Step 2: Identify Tasks

Once you have the work item details, help the user break down the work into tasks. For each task, you'll need:

1. **Task Key**: Unique identifier (e.g., "task-1", "PM-001", "auth-1")
2. **Type**: One of: research, implement, verify, docs, cleanup
3. **Title**: Clear task title
4. **Goal**: One-sentence description of what to accomplish
5. **Context** (optional): Additional context or background
6. **Verification** (optional): How to verify the task is complete
7. **Timebox** (optional): Estimated time in minutes (default: 15)
8. **Risk** (optional): low, medium, or high (default: low)
9. **Dependencies** (optional): Array of task keys this task depends on

### Step 3: Establish Timeline

Task dependencies create the timeline:
- Tasks with no dependencies can start immediately
- Tasks with dependencies must wait for their dependencies to complete
- Multiple dependencies are supported (e.g., task-4 depends on both task-2 and task-3)

### Step 4: Create Work Item and Tasks

Once you have all the information, use:
1. Create the work item using \`pm.work_item_create\`
2. Create each task using \`pm.task_create\` in dependency order
3. Set task dependencies using task IDs (you'll get these when creating tasks)

## Example Interaction

**User:** "Create a work item for user authentication"

**You should:**
1. Ask: "What should the work item be titled? (e.g., 'User Authentication')"
2. Ask: "What tasks are needed? Let me help you break this down..."
3. Guide through task creation with dependencies
4. Create everything once you have all details

## Task Creation Guidelines

- **Break down into small, focused tasks**: Each task should be completable independently (after dependencies)
- **Use clear task keys**: Make them meaningful (e.g., "auth-research", "auth-login-form")
- **Establish dependencies**: Think about what must happen first
- **Set appropriate types**: Use research for exploration, implement for building, verify for testing
- **Define clear goals**: Each task should have a one-sentence goal
- **Consider timeboxes**: Estimate realistic time for each task

## Available Tools

- \`pm.work_item_create\`: Create a work item
- \`pm.task_create\`: Create individual tasks
- \`pm.work_item_list\`: List existing work items
- \`pm.work_item_get\`: Get work item details
- \`pm.evidence_add\`: Add evidence to tasks (REQUIRED for task completion)
- \`pm.task_record_touched_files\`: Track file changes during task execution

## Task Execution Reminders

When executing tasks created through this work item, remember:
- **Evidence is required**: Tasks cannot be marked done without evidence
- **Track files**: Use \`pm.task_record_touched_files\` after modifying files
- **Add evidence immediately**: Don't wait until the end - add evidence as you work
- **Use appropriate evidence types**: note, link, log, or diff depending on the work done

## Important Notes

- Task keys must be unique within the work item
- Dependencies are specified by task IDs (you'll get these when creating tasks)
- Tasks should be created in topological order (no dependencies first)
- The system validates that all dependency IDs exist

## Getting Started

Begin by asking the user for the work item title and description. Then help them identify the tasks needed to complete the work item.

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

