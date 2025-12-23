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
  implementGetContext,
  implementPickNextTask,
  implementStartTask,
  implementBlockTask,
  implementAppendArtifact,
  implementEvaluateGates,
  implementCompleteTask,
  implementCreateCheckpoint,
  implementRecordDecision,
  implementAssertInScope,
} from './toolImplementations';

export interface ToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
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
          type: 'text' as const,
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
 * Handles pm.get_context tool calls (renamed from get_project_context)
 */
export async function handleGetContext(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const context = await implementGetContext(userId, params);
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
 * Handles pm.pick_next_task tool calls
 */
export async function handlePickNextTask(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const task = await implementPickNextTask(userId, params);
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
 * Handles pm.start_task tool calls
 */
export async function handleStartTask(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const task = await implementStartTask(userId, params);
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
 * Handles pm.block_task tool calls
 */
export async function handleBlockTask(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const task = await implementBlockTask(userId, params);
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
 * Handles pm.append_artifact tool calls
 */
export async function handleAppendArtifact(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const artifact = await implementAppendArtifact(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(artifact, null, 2),
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
 * Handles pm.evaluate_gates tool calls
 */
export async function handleEvaluateGates(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const results = await implementEvaluateGates(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
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
 * Handles pm.complete_task tool calls
 */
export async function handleCompleteTask(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const task = await implementCompleteTask(userId, params);
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
 * Handles pm.create_checkpoint tool calls
 */
export async function handleCreateCheckpoint(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const checkpoint = await implementCreateCheckpoint(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(checkpoint, null, 2),
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
 * Handles pm.record_decision tool calls
 */
export async function handleRecordDecision(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const decision = await implementRecordDecision(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(decision, null, 2),
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
 * Handles pm.assert_in_scope tool calls
 */
export async function handleAssertInScope(
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const userId = resolveUserId(params);
    const result = await implementAssertInScope(userId, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
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
 * All tools use the pm.* prefix
 */
export async function routeToolCall(
  toolName: string,
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  switch (toolName) {
    case 'pm.create_project':
      return handleCreateProject(params);
    case 'pm.list_projects':
      return handleListProjects(params);
    case 'pm.create_task':
      return handleCreateTask(params);
    case 'pm.list_tasks':
      return handleListTasks(params);
    case 'pm.update_task':
      return handleUpdateTask(params);
    case 'pm.get_context':
      return handleGetContext(params);
    case 'pm.pick_next_task':
      return handlePickNextTask(params);
    case 'pm.start_task':
      return handleStartTask(params);
    case 'pm.block_task':
      return handleBlockTask(params);
    case 'pm.append_artifact':
      return handleAppendArtifact(params);
    case 'pm.evaluate_gates':
      return handleEvaluateGates(params);
    case 'pm.complete_task':
      return handleCompleteTask(params);
    case 'pm.create_checkpoint':
      return handleCreateCheckpoint(params);
    case 'pm.record_decision':
      return handleRecordDecision(params);
    case 'pm.assert_in_scope':
      return handleAssertInScope(params);
    default:
      return {
        content: [
          {
            type: 'text' as const,
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

