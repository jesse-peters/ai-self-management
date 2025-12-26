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
  implementManifestDiscover,
  implementManifestValidate,
  implementManifestRead,
  implementInterviewQuestions,
  implementInitWithInterview,
  implementProjectConventionsGet,
  implementConventionsSyncToPrimer,
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
 * Handles pm.manifest_discover tool calls
 */
export async function handleManifestDiscover(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementManifestDiscover(accessToken, params);
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
 * Handles pm.manifest_validate tool calls
 */
export async function handleManifestValidate(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementManifestValidate(accessToken, params);
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
 * Handles pm.manifest_read tool calls
 */
export async function handleManifestRead(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementManifestRead(accessToken, params);
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
 * Handles interview_questions tool calls
 */
export async function handleInterviewQuestions(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementInterviewQuestions(accessToken, params);
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
 * Handles init_with_interview tool calls
 */
export async function handleInitWithInterview(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementInitWithInterview(accessToken, params);
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
 * Handles project_conventions_get tool calls
 */
export async function handleProjectConventionsGet(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementProjectConventionsGet(accessToken, params);
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
 * Handles conventions_sync_to_primer tool calls
 */
export async function handleConventionsSyncToPrimer(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementConventionsSyncToPrimer(accessToken, params);
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
      case 'pm.init':
        result = await handleInit(params, accessToken);
        break;
      case 'pm.status':
        result = await handleStatus(params, accessToken);
        break;
      case 'pm.task_create':
        result = await handleTaskCreate(params, accessToken);
        break;
      case 'pm.task_set_status':
        result = await handleTaskSetStatus(params, accessToken);
        break;
      case 'pm.memory_recall':
        result = await handleMemoryRecall(params, accessToken);
        break;
      case 'pm.record_decision':
        result = await handleRecordDecision(params, accessToken);
        break;
      case 'pm.record_outcome':
        result = await handleRecordOutcome(params, accessToken);
        break;
      case 'pm.gate_run':
        result = await handleGateRun(params, accessToken);
        break;
      case 'pm.gate_status':
        result = await handleGateStatus(params, accessToken);
        break;
      case 'pm.create_constraint':
        result = await handleCreateConstraint(params, accessToken);
        break;
      case 'pm.evaluate_constraints':
        result = await handleEvaluateConstraints(params, accessToken);
        break;
      case 'pm.evidence_add':
        result = await handleEvidenceAdd(params, accessToken);
        break;
      case 'pm.manifest_discover':
        result = await handleManifestDiscover(params, accessToken);
        break;
      case 'pm.manifest_validate':
        result = await handleManifestValidate(params, accessToken);
        break;
      case 'pm.manifest_read':
        result = await handleManifestRead(params, accessToken);
        break;
      case 'pm.interview_questions':
        result = await handleInterviewQuestions(params, accessToken);
        break;
      case 'pm.init_with_interview':
        result = await handleInitWithInterview(params, accessToken);
        break;
      case 'pm.project_conventions_get':
        result = await handleProjectConventionsGet(params, accessToken);
        break;
      case 'pm.conventions_sync_to_primer':
        result = await handleConventionsSyncToPrimer(params, accessToken);
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

