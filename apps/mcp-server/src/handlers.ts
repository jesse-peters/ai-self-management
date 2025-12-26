/**
 * MCP tool request handlers - Simplified
 * Handles the 11 core tools only
 */

import { resolveUserId } from './auth';
import { mapErrorToMCP, MCPErrorResponse } from './errors';
import * as Sentry from '@sentry/node';
import { verifyAccessToken } from '@projectflow/core';
import {
  implementInit,
  implementStatus,
  implementAgentTaskCreate,
  implementAgentTaskSetStatus,
  implementMemoryRecall,
  implementRecordDecision,
  implementRecordOutcome,
  implementGateRun,
  implementGateStatus,
  implementCreateConstraint,
  implementEvaluateConstraints,
  implementEvidenceAdd,
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
  implementListConstraints,
  implementAssertInScope,
  implementWizardStart,
  implementWizardStep,
  implementWizardFinish,
} from './toolImplementations';

export interface ToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Handles init tool calls
 */
export async function handleInit(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementInit(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            project: result.project,
            gates: result.gates,
            message: result.message,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles status tool calls
 */
export async function handleStatus(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementStatus(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles task_create tool calls
 */
export async function handleTaskCreate(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementAgentTaskCreate(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles task_set_status tool calls
 */
export async function handleTaskSetStatus(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementAgentTaskSetStatus(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles memory_recall tool calls
 */
export async function handleMemoryRecall(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementMemoryRecall(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const context = await implementGetContext(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(context, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementPickNextTask(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementStartTask(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementBlockTask(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const artifact = await implementAppendArtifact(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(artifact, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const results = await implementEvaluateGates(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementCompleteTask(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const checkpoint = await implementCreateCheckpoint(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(checkpoint, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementRecordDecision(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles record_outcome tool calls
 */
export async function handleRecordOutcome(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementRecordOutcome(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles pm.create_constraint tool calls
 */
export async function handleCreateConstraint(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const constraint = await implementCreateConstraint(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(constraint, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles pm.list_constraints tool calls
 */
export async function handleListConstraints(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const constraints = await implementListConstraints(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(constraints, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles pm.evaluate_constraints tool calls
 */
export async function handleEvaluateConstraints(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementEvaluateConstraints(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles gate_run tool calls
 */
export async function handleGateRun(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementGateRun(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles gate_status tool calls
 */
export async function handleGateStatus(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementGateStatus(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles evidence_add tool calls
 */
export async function handleEvidenceAdd(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementEvidenceAdd(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Context already set in routeToolCall
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
 * Handles pm.create_project tool calls
 */
export async function handleCreateProject(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementCreateProject(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Handles pm.list_projects tool calls
 */
export async function handleListProjects(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementListProjects(accessToken);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Handles pm.create_task tool calls
 */
export async function handleCreateTask(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementCreateTask(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Handles pm.list_tasks tool calls
 */
export async function handleListTasks(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementListTasks(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Handles pm.update_task tool calls
 */
export async function handleUpdateTask(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementUpdateTask(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Handles pm.assert_in_scope tool calls
 */
export async function handleAssertInScope(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementAssertInScope(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Handles pm.wizard_start tool calls
 */
export async function handleWizardStart(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementWizardStart(accessToken);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Handles pm.wizard_step tool calls
 */
export async function handleWizardStep(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementWizardStep(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Handles pm.wizard_finish tool calls
 */
export async function handleWizardFinish(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementWizardFinish(accessToken, params);
    return {
      content: [
        {
          type: 'text' as const,
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
 * Helper to extract userId from token for Sentry context
 */
async function getUserIdFromToken(accessToken: string): Promise<string | undefined> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const audience = `${apiUrl}/api/mcp`;
    const claims = await verifyAccessToken(accessToken, audience);
    return claims.sub;
  } catch {
    return undefined;
  }
}

/**
 * Routes tool calls to appropriate handlers
 * All tools use the pm.* prefix
 */
export async function routeToolCall(
  toolName: string,
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  // Set Sentry context for this tool call
  const userId = await getUserIdFromToken(accessToken);
  Sentry.setContext('mcp_tool_call', {
    toolName,
    userId,
  });
  if (userId) {
    Sentry.setUser({ id: userId });
  }

  try {
    let result: ToolCallResult;
    switch (toolName) {
      case 'pm.create_project':
        result = await handleCreateProject(params, accessToken);
        break;
      case 'pm.list_projects':
        result = await handleListProjects(params, accessToken);
        break;
      case 'pm.create_task':
        result = await handleCreateTask(params, accessToken);
        break;
      case 'pm.list_tasks':
        result = await handleListTasks(params, accessToken);
        break;
      case 'pm.update_task':
        result = await handleUpdateTask(params, accessToken);
        break;
      case 'pm.get_context':
        result = await handleGetContext(params, accessToken);
        break;
      case 'pm.pick_next_task':
        result = await handlePickNextTask(params, accessToken);
        break;
      case 'pm.start_task':
        result = await handleStartTask(params, accessToken);
        break;
      case 'pm.block_task':
        result = await handleBlockTask(params, accessToken);
        break;
      case 'pm.append_artifact':
        result = await handleAppendArtifact(params, accessToken);
        break;
      case 'pm.evaluate_gates':
        result = await handleEvaluateGates(params, accessToken);
        break;
      case 'pm.complete_task':
        result = await handleCompleteTask(params, accessToken);
        break;
      case 'pm.create_checkpoint':
        result = await handleCreateCheckpoint(params, accessToken);
        break;
      case 'pm.record_decision':
        result = await handleRecordDecision(params, accessToken);
        break;
      case 'pm.record_outcome':
        result = await handleRecordOutcome(params, accessToken);
        break;
      case 'pm.create_constraint':
        result = await handleCreateConstraint(params, accessToken);
        break;
      case 'pm.list_constraints':
        result = await handleListConstraints(params, accessToken);
        break;
      case 'pm.evaluate_constraints':
        result = await handleEvaluateConstraints(params, accessToken);
        break;
      case 'pm.assert_in_scope':
        result = await handleAssertInScope(params, accessToken);
        break;
      case 'pm.memory_recall':
        result = await handleMemoryRecall(params, accessToken);
        break;
      case 'pm.wizard_start':
        result = await handleWizardStart(params, accessToken);
        break;
      case 'pm.wizard_step':
        result = await handleWizardStep(params, accessToken);
        break;
      case 'pm.wizard_finish':
        result = await handleWizardFinish(params, accessToken);
        break;
      default:
        result = {
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
    return result;
  } catch (error) {
    // Context is already set in routeToolCall, just pass error
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

