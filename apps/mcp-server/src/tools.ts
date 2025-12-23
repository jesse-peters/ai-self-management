/**
 * MCP Tool definitions for ProjectFlow
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: 'create_project',
    description: 'Creates a new project for the user',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Optional project description' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_projects',
    description: 'Lists all projects for the user',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Creates a new task in a project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Optional task description' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'Task status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority',
        },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Lists tasks in a project with optional filters',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
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
    name: 'update_task',
    description: 'Updates an existing task',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        title: { type: 'string', description: 'New task title' },
        description: { type: 'string', description: 'New task description' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
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
    name: 'get_project_context',
    description: 'Gets complete project context including project, tasks, and latest session',
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
    name: 'save_session_context',
    description: 'Saves an agent session snapshot for a project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        snapshot: { type: 'object', description: 'Session state snapshot (JSON object)' },
        summary: { type: 'string', description: 'Optional session summary' },
        userId: { type: 'string', description: 'User ID (optional if set in env)' },
      },
      required: ['projectId', 'snapshot'],
    },
  },
];

