/**
 * MCP Tool definitions for ProjectFlow
 * Simplified to 10 core tools grouped by function
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  // ========== CORE (3 tools) ==========
  {
    name: 'pm.init',
    description: 'Initializes a new project with sensible defaults (basic gates: tests, lint, review). Quick start for new projects. If repoRoot is provided, creates .pm/project.json and .pm/local.json manifest files.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Optional project description' },
        skipGates: { type: 'boolean', description: 'Skip creating default gates' },
        repoRoot: { type: 'string', description: 'Optional path to repository root for manifest creation (defaults to current directory)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'pm.status',
    description: 'Gets comprehensive project status in one call: active task, recent decisions, gate status, constraints, and suggested next action.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.project_get',
    description: 'Gets a single project by ID with its details.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },

  // ========== WORK ITEMS (4 tools) ==========
  {
    name: 'pm.work_item_create',
    description: 'Creates a new work item (external ticket reference) that groups related agent tasks.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        title: { type: 'string', description: 'Work item title' },
        description: { type: 'string', description: 'Optional work item description' },
        externalUrl: { type: 'string', description: 'Optional external URL (e.g., GitHub issue, Jira ticket)' },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'pm.work_item_get',
    description: 'Gets a single work item by ID with task counts and gate status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workItemId: { type: 'string', description: 'Work item ID' },
      },
      required: ['workItemId'],
    },
  },
  {
    name: 'pm.work_item_list',
    description: 'Lists work items for a project with optional status filter.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'done'],
          description: 'Optional status filter',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.work_item_set_status',
    description: 'Updates work item status (enforces gate requirement for done status).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workItemId: { type: 'string', description: 'Work item ID' },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'done'],
          description: 'New status',
        },
      },
      required: ['workItemId', 'status'],
    },
  },

  // ========== TASKS (3 tools) ==========
  {
    name: 'pm.task_create',
    description: 'Creates a new agent task (micro work packet) with goal, verification, and dependencies.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        type: {
          type: 'string',
          enum: ['research', 'implement', 'verify', 'docs', 'cleanup'],
          description: 'Task type',
        },
        title: { type: 'string', description: 'Task title' },
        goal: { type: 'string', description: '1 sentence goal' },
        context: { type: 'string', description: 'Optional context text' },
        verification: { type: 'string', description: 'Optional verification steps' },
        workItemId: { type: 'string', description: 'Optional work item ID to link this task to' },
        dependsOnIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task IDs that must be completed before this task',
        },
        timeboxMinutes: { type: 'number', description: 'Timebox in minutes (default: 15)' },
      },
      required: ['projectId', 'type', 'title', 'goal'],
    },
  },
  {
    name: 'pm.task_get',
    description: 'Gets a single agent task by ID with enriched data (evidence count, work item title).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'pm.task_set_status',
    description: 'Updates task status (enforces evidence rule, research gating, and blocker rule).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        status: {
          type: 'string',
          enum: ['ready', 'doing', 'blocked', 'review', 'done'],
          description: 'New status',
        },
        blockedReason: { type: 'string', description: 'Required when setting status to blocked' },
      },
      required: ['taskId', 'status'],
    },
  },

  // ========== MEMORY (3 tools) ==========
  {
    name: 'pm.memory_recall',
    description: 'Recalls relevant history (decisions, outcomes, constraints) for a project to inform major decisions. Use this before recording important decisions to avoid repeating past mistakes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        query: { type: 'string', description: 'Free-text search query describing what you want to recall' },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional keywords to match in content',
        },
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
        since: { type: 'string', description: 'ISO timestamp - only recall memories after this time' },
        until: { type: 'string', description: 'ISO timestamp - only recall memories before this time' },
        limit: { type: 'number', description: 'Max results per category (default 10)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.record_decision',
    description: 'Records a key architectural or design decision for a project.',
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
      },
      required: ['projectId', 'title', 'options', 'choice', 'rationale'],
    },
  },
  {
    name: 'pm.record_outcome',
    description: 'Records the actual result of a decision, task, gate, or checkpoint to enable learning.',
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
      },
      required: ['projectId', 'subjectType', 'subjectId', 'result', 'createdBy'],
    },
  },

  // ========== GATES (3 tools) ==========
  {
    name: 'pm.gate_configure',
    description: 'Configures gates for a project (creates or updates gates).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        gates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Gate name' },
              description: { type: 'string', description: 'Optional gate description' },
              runnerMode: {
                type: 'string',
                enum: ['manual', 'command'],
                description: 'How the gate is executed',
              },
              command: { type: 'string', description: 'Command to run (required if runnerMode is "command")' },
              isRequired: { type: 'boolean', description: 'Whether this gate is required to pass' },
            },
            required: ['name', 'runnerMode'],
          },
          description: 'Array of gate configurations',
        },
      },
      required: ['projectId', 'gates'],
    },
  },
  {
    name: 'pm.gate_run',
    description: 'Runs a gate and stores the result.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        gateName: { type: 'string', description: 'Name of the gate to run' },
        taskId: { type: 'string', description: 'Optional task ID to associate with this run' },
        workItemId: { type: 'string', description: 'Optional work item ID to associate with this run' },
        cwd: { type: 'string', description: 'Optional working directory for command execution' },
      },
      required: ['projectId', 'gateName'],
    },
  },
  {
    name: 'pm.gate_status',
    description: 'Gets the latest status for all gates in a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        workItemId: { type: 'string', description: 'Optional work item ID to filter runs' },
      },
      required: ['projectId'],
    },
  },

  // ========== MANIFEST & DISCOVERY (3 tools) ==========
  {
    name: 'pm.evidence_add',
    description: 'Adds evidence (proof) to a task or work item.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        type: {
          type: 'string',
          enum: ['note', 'link', 'log', 'diff'],
          description: 'Evidence type',
        },
        content: { type: 'string', description: 'Evidence content (text, URL, log output, etc.)' },
        taskId: { type: 'string', description: 'Optional task ID' },
        workItemId: { type: 'string', description: 'Optional work item ID' },
      },
      required: ['projectId', 'type', 'content'],
    },
  },

  // ========== MANIFEST (3 tools) ==========
  {
    name: 'pm.manifest_discover',
    description: 'Discovers the .pm directory by walking up from the current directory. Returns the project ID and user ID if manifests exist.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        startDir: { type: 'string', description: 'Optional starting directory (defaults to current directory)' },
      },
    },
  },
  {
    name: 'pm.manifest_read',
    description: 'Reads the project and local manifests from the .pm directory. Returns full manifest data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        startDir: { type: 'string', description: 'Optional starting directory (defaults to current directory)' },
      },
    },
  },

  // ========== INTERVIEW (3 tools) ==========
  {
    name: 'pm.interview_questions',
    description: 'Gets the list of questions for the project init interview. Use to guide the agent through capturing project conventions (stack, commands, environments, etc.).',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'pm.init_with_interview',
    description: 'Initializes a project and runs the setup interview. Takes interview responses and stores project conventions for recon/primer generation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Optional project description' },
        repoRoot: { type: 'string', description: 'Optional path to repository root for manifest creation' },
        interviewResponses: {
          type: 'object',
          description: 'Answers to interview questions. Keys should match question IDs.',
          additionalProperties: true,
        },
      },
      required: ['name', 'interviewResponses'],
    },
  },
  {
    name: 'pm.project_conventions_get',
    description: 'Gets the stored project conventions (from a previous interview) for a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'pm.conventions_sync_to_primer',
    description: 'Syncs stored project conventions from SaaS to local .pm/primer.md file. Updates machine-generated section while preserving user edits.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        repoRoot: { type: 'string', description: 'Optional path to repository root (defaults to current directory)' },
      },
      required: ['projectId'],
    },
  },

  // ========== PLAN MODE (2 tools) ==========
  {
    name: 'pm.plan_import',
    description: 'Imports a plan file (markdown format) for a work item, creating or updating tasks from the plan structure.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workItemId: { type: 'string', description: 'Work item ID to import plan into' },
        planText: { type: 'string', description: 'Markdown plan file content' },
      },
      required: ['workItemId', 'planText'],
    },
  },
  {
    name: 'pm.plan_export',
    description: 'Exports a work item\'s tasks as a plan file (markdown format) for use in Cursor Plan Mode.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workItemId: { type: 'string', description: 'Work item ID to export' },
      },
      required: ['workItemId'],
    },
  },
];

