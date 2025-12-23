/**
 * MCP Tool definitions for ProjectFlow
 * All tools use the pm.* prefix for consistency
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: 'pm.create_project',
    description: 'Creates a new project for the user',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Optional project description' },
        rules: { type: 'object', description: 'Optional project rules (JSONB object)' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'pm.list_projects',
    description: 'Lists all projects for the user',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
    },
  },
  {
    name: 'pm.create_task',
    description: 'Creates a new task in a project with acceptance criteria, constraints, and dependencies',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Optional task description' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done', 'blocked', 'cancelled'],
          description: 'Task status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority',
        },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of acceptance criteria strings',
        },
        constraints: {
          type: 'object',
          description: 'Task constraints (allowedPaths, forbiddenPaths, maxFiles, etc.)',
        },
        dependencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task IDs that must be completed before this task',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'pm.list_tasks',
    description: 'Lists tasks in a project with optional filters',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done', 'blocked', 'cancelled'],
          description: 'Filter by status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Filter by priority',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.update_task',
    description: 'Updates an existing task',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        title: { type: 'string', description: 'New task title' },
        description: { type: 'string', description: 'New task description' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done', 'blocked', 'cancelled'],
          description: 'New task status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'New task priority',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'pm.get_context',
    description: 'Gets complete project context including project, tasks, latest checkpoint, and active task',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.pick_next_task',
    description: 'Picks and locks the next available task for a project based on strategy',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        strategy: {
          type: 'string',
          enum: ['priority', 'dependencies', 'oldest', 'newest'],
          description: 'Task picking strategy (default: dependencies)',
        },
        lockedBy: { type: 'string', description: 'Optional identifier for the agent/session locking the task' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.start_task',
    description: 'Starts a task that has been picked/locked',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID to start' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'pm.block_task',
    description: 'Blocks a task with a reason, optionally requiring human intervention',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID to block' },
        reason: { type: 'string', description: 'Reason for blocking the task' },
        needsHuman: { type: 'boolean', description: 'Whether human intervention is required' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['taskId', 'reason'],
    },
  },
  {
    name: 'pm.append_artifact',
    description: 'Appends an artifact to a task (diff, PR, test report, document, etc.)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        type: {
          type: 'string',
          enum: ['diff', 'pr', 'test_report', 'document', 'other'],
          description: 'Artifact type',
        },
        ref: { type: 'string', description: 'Artifact reference (URL, path, identifier)' },
        summary: { type: 'string', description: 'Optional artifact summary' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['taskId', 'type', 'ref'],
    },
  },
  {
    name: 'pm.evaluate_gates',
    description: 'Evaluates quality gates for a task and returns pass/fail status with missing requirements',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID to evaluate gates for' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'pm.complete_task',
    description: 'Completes a task after verifying gates pass and artifacts are attached',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID to complete' },
        artifactIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of artifact IDs to verify (if not provided, checks all artifacts)',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'pm.create_checkpoint',
    description: 'Creates a checkpoint (resumable project snapshot) with git reference and resume instructions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        label: { type: 'string', description: 'Checkpoint label' },
        repoRef: { type: 'string', description: 'Optional git reference (commit, branch, tag)' },
        summary: { type: 'string', description: 'Human-readable summary of project state' },
        resumeInstructions: { type: 'string', description: 'Optional instructions for resuming work from this checkpoint' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId', 'label', 'summary'],
    },
  },
  {
    name: 'pm.record_decision',
    description: 'Records a key architectural or design decision for a project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        title: { type: 'string', description: 'Decision title' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of options that were considered',
        },
        choice: { type: 'string', description: 'The option that was selected' },
        rationale: { type: 'string', description: 'Explanation of why this choice was made' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId', 'title', 'options', 'choice', 'rationale'],
    },
  },
  {
    name: 'pm.assert_in_scope',
    description: 'Asserts that a changeset is within the allowed scope for a task (enforces "leash" constraints)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID to check scope for' },
        changesetManifest: {
          type: 'object',
          description: 'Changeset manifest with file changes',
          properties: {
            filesChanged: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file paths that were changed',
            },
            filesAdded: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file paths that were added',
            },
            filesDeleted: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file paths that were deleted',
            },
          },
          required: ['filesChanged', 'filesAdded', 'filesDeleted'],
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['taskId', 'changesetManifest'],
    },
  },
];

