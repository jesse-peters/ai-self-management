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
    name: 'pm.record_outcome',
    description: 'Records the actual result of a decision, task, gate, or checkpoint to enable learning',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        subjectType: {
          type: 'string',
          enum: ['decision', 'task', 'gate', 'checkpoint'],
          description: 'Type of subject this outcome is about',
        },
        subjectId: { type: 'string', description: 'ID of the decision, task, gate, or checkpoint' },
        result: {
          type: 'string',
          enum: ['worked', 'didnt_work', 'mixed', 'unknown'],
          description: 'How it turned out',
        },
        evidenceIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of artifact IDs or other evidence references',
        },
        notes: { type: 'string', description: 'Optional notes about what happened' },
        rootCause: { type: 'string', description: 'Optional: Why did it work or not work?' },
        recommendation: { type: 'string', description: 'Optional: What should we do differently next time?' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for categorization',
        },
        createdBy: {
          type: 'string',
          enum: ['agent', 'human'],
          description: 'Who recorded this outcome',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId', 'subjectType', 'subjectId', 'result', 'createdBy'],
    },
  },
  {
    name: 'pm.create_constraint',
    description: 'Creates a constraint (enforceable rule) for a project that warns or blocks risky actions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        scope: {
          type: 'string',
          enum: ['project', 'repo', 'directory', 'task_type'],
          description: 'Constraint scope',
        },
        scopeValue: { type: 'string', description: 'Optional: specific directory path or task type' },
        trigger: {
          type: 'string',
          enum: ['files_match', 'task_tag', 'gate', 'keyword', 'always'],
          description: 'Trigger condition',
        },
        triggerValue: { type: 'string', description: 'Optional: specific pattern, tag, gate, or keyword' },
        ruleText: { type: 'string', description: 'Human-readable rule description' },
        enforcementLevel: {
          type: 'string',
          enum: ['warn', 'block'],
          description: 'Enforcement level (warn or block)',
        },
        sourceLinks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              id: { type: 'string' },
            },
            required: ['type', 'id'],
          },
          description: 'Optional: links to decisions/outcomes that justify this constraint',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId', 'scope', 'trigger', 'ruleText', 'enforcementLevel'],
    },
  },
  {
    name: 'pm.list_constraints',
    description: 'Lists all constraints for a project with optional filters',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        scope: {
          type: 'string',
          enum: ['project', 'repo', 'directory', 'task_type'],
          description: 'Filter by scope',
        },
        trigger: {
          type: 'string',
          enum: ['files_match', 'task_tag', 'gate', 'keyword', 'always'],
          description: 'Filter by trigger',
        },
        enforcementLevel: {
          type: 'string',
          enum: ['warn', 'block'],
          description: 'Filter by enforcement level',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.evaluate_constraints',
    description: 'Evaluates constraints against a given context (files, tags, keywords, etc.) and returns violations and warnings',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        context: {
          type: 'object',
          description: 'Context for evaluation',
          properties: {
            files: {
              type: 'array',
              items: { type: 'string' },
              description: 'File paths being changed',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Task tags',
            },
            gate: { type: 'string', description: 'Gate being evaluated' },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords in description/content',
            },
            taskType: { type: 'string', description: 'Type of task' },
            directory: { type: 'string', description: 'Directory being modified' },
          },
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId', 'context'],
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
  {
    name: 'pm.memory_recall',
    description:
      'Recalls relevant history (decisions, outcomes, constraints) for a project to inform major decisions. ' +
      'Use this before recording important decisions to avoid repeating past mistakes and learn from prior experience.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        query: { type: 'string', description: 'Free-text search query describing what you want to recall' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags to match for more targeted recall',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional file paths to find history related to these files',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional keywords to match in content',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.wizard_start',
    description: 'Starts a new project wizard session for structured project kickoff',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
    },
  },
  {
    name: 'pm.wizard_step',
    description: 'Submits data for a specific wizard step and advances to the next step',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string', description: 'Wizard session ID from pm.wizard_start' },
        stepId: { type: 'number', description: 'Step number (1-5)' },
        payload: {
          type: 'object',
          description: 'Step data payload. Structure depends on step: ' +
            'Step 1: {name, description?, repo_url?, main_branch?, language?, framework?}. ' +
            'Step 2: {goals, definition_of_done, deliverables?: [{name, description, acceptance_criteria?}]}. ' +
            'Step 3: {risk_areas?: [], do_not_touch?: [], preferences?: {}}. ' +
            'Step 4: {gate_pack_id?, custom_gates?: [{type, config?}]}. ' +
            'Step 5: {} (review, no new data)',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['sessionId', 'stepId', 'payload'],
    },
  },
  {
    name: 'pm.wizard_finish',
    description: 'Finishes the wizard and creates the project with spec, seed tasks, gates, and initial checkpoint',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string', description: 'Wizard session ID from pm.wizard_start' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['sessionId'],
    },
  },
];

