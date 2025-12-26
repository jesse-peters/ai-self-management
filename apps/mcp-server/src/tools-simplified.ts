/**
 * MCP Tool definitions for ProjectFlow
 * Simplified to 10 core tools grouped by function
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  // ========== CORE (2 tools) ==========
  {
    name: 'pm.init',
    description: 'Initializes a new project with sensible defaults (basic gates: tests, lint, review). Quick start for new projects.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Optional project description' },
        skipGates: { type: 'boolean', description: 'Skip creating default gates' },
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

  // ========== TASKS (2 tools) ==========
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

  // ========== GATES (2 tools) ==========
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

  // ========== ADVANCED (2 tools) ==========
  {
    name: 'pm.create_constraint',
    description: 'Creates a constraint (enforceable rule) for a project that warns or blocks risky actions.',
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
      },
      required: ['projectId', 'scope', 'trigger', 'ruleText', 'enforcementLevel'],
    },
  },
  {
    name: 'pm.evaluate_constraints',
    description: 'Evaluates constraints against a given context (files, tags, keywords, etc.) and returns violations and warnings.',
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
      },
      required: ['projectId', 'context'],
    },
  },

  // ========== UTILITY (1 tool) ==========
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
];

