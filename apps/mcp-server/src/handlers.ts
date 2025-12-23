/**
 * MCP tool request handlers
 */

import { resolveUserId } from './auth';
import { mapErrorToMCP, MCPErrorResponse } from './errors';
import {
  implementCreateProject,
  implementListProjects,
  implementCreateTask,
  implementListTasks,
  implementUpdateTask,
  implementGetProjectContext,
  implementSaveSessionContext,
} from './toolImplementations';

export interface ToolCallResult {
  content?: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * Handles create_project tool calls
 */
export async function handleCreateProject(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const project = await implementCreateProject(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  } catch (error) {
    const mcpError = mapErrorToMCP(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mcpError),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handles list_projects tool calls
 */
export async function handleListProjects(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const projects = await implementListProjects(userId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  } catch (error) {
    const mcpError = mapErrorToMCP(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mcpError),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handles create_task tool calls
 */
export async function handleCreateTask(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const task = await implementCreateTask(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    const mcpError = mapErrorToMCP(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mcpError),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handles list_tasks tool calls
 */
export async function handleListTasks(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const tasks = await implementListTasks(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  } catch (error) {
    const mcpError = mapErrorToMCP(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mcpError),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handles update_task tool calls
 */
export async function handleUpdateTask(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const task = await implementUpdateTask(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    const mcpError = mapErrorToMCP(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mcpError),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handles get_project_context tool calls
 */
export async function handleGetProjectContext(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const context = await implementGetProjectContext(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(context, null, 2),
        },
      ],
    };
  } catch (error) {
    const mcpError = mapErrorToMCP(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mcpError),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handles save_session_context tool calls
 */
export async function handleSaveSessionContext(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const session = await implementSaveSessionContext(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(session, null, 2),
        },
      ],
    };
  } catch (error) {
    const mcpError = mapErrorToMCP(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mcpError),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Routes tool calls to appropriate handlers
 */
export async function routeToolCall(
  toolName: string,
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  switch (toolName) {
    case 'create_project':
      return handleCreateProject(params);
    case 'list_projects':
      return handleListProjects(params);
    case 'create_task':
      return handleCreateTask(params);
    case 'list_tasks':
      return handleListTasks(params);
    case 'update_task':
      return handleUpdateTask(params);
    case 'get_project_context':
      return handleGetProjectContext(params);
    case 'save_session_context':
      return handleSaveSessionContext(params);
    default:
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'UNKNOWN_TOOL',
              message: `Unknown tool: ${toolName}`,
            }),
          },
        ],
        isError: true,
      };
  }
}

