/**
 * MCP tool request handlers - Simplified
 * Handles the 11 core tools only
 */

import { resolveUserId } from './auth';
import { mapErrorToMCP, MCPErrorResponse } from './errors';
import {
  implementInit,
  implementStatus,
  implementProjectGet,
  implementAgentTaskCreate,
  implementAgentTaskGet,
  implementAgentTaskSetStatus,
  implementTaskRecordTouchedFiles,
  implementWorkItemCreate,
  implementWorkItemGet,
  implementWorkItemList,
  implementWorkItemSetStatus,
  implementMemoryRecall,
  implementRecordDecision,
  implementRecordOutcome,
  implementGateConfigure,
  implementGateRun,
  implementGateStatus,
  implementEvidenceAdd,
  implementPlanImport,
  implementPlanExport,
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
 * Handles project_get tool calls
 */
export async function handleProjectGet(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementProjectGet(accessToken, params);
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
 * Handles task_record_touched_files tool calls
 */
export async function handleTaskRecordTouchedFiles(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementTaskRecordTouchedFiles(accessToken, params);
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
 * Handles task_get tool calls
 */
export async function handleTaskGet(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementAgentTaskGet(accessToken, params);
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
 * Handles work_item_create tool calls
 */
export async function handleWorkItemCreate(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementWorkItemCreate(accessToken, params);
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
 * Handles work_item_get tool calls
 */
export async function handleWorkItemGet(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementWorkItemGet(accessToken, params);
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
 * Handles work_item_list tool calls
 */
export async function handleWorkItemList(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementWorkItemList(accessToken, params);
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
 * Handles work_item_set_status tool calls
 */
export async function handleWorkItemSetStatus(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementWorkItemSetStatus(accessToken, params);
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
 * Handles record_decision tool calls
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
 * Handles gate_configure tool calls
 */
export async function handleGateConfigure(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementGateConfigure(accessToken, params);
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
 * Handles plan_import tool calls
 */
export async function handlePlanImport(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementPlanImport(accessToken, params);
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
 * Handles plan_export tool calls
 */
export async function handlePlanExport(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementPlanExport(accessToken, params);
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
 * Routes tool calls to appropriate handler
 * 
 * @param toolName Tool name (must be one of the 11 core tools)
 * @param params Tool parameters
 * @param accessToken Access token
 * @returns Tool call result
 */
export async function routeToolCall(
  toolName: string,
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  switch (toolName) {
    // Core
    case 'pm.init':
      return handleInit(params, accessToken);
    case 'pm.status':
      return handleStatus(params, accessToken);
    case 'pm.project_get':
      return handleProjectGet(params, accessToken);

    // Work Items
    case 'pm.work_item_create':
      return handleWorkItemCreate(params, accessToken);
    case 'pm.work_item_get':
      return handleWorkItemGet(params, accessToken);
    case 'pm.work_item_list':
      return handleWorkItemList(params, accessToken);
    case 'pm.work_item_set_status':
      return handleWorkItemSetStatus(params, accessToken);

    // Tasks
    case 'pm.task_create':
      return handleTaskCreate(params, accessToken);
    case 'pm.task_get':
      return handleTaskGet(params, accessToken);
    case 'pm.task_set_status':
      return handleTaskSetStatus(params, accessToken);
    case 'pm.task_record_touched_files':
      return handleTaskRecordTouchedFiles(params, accessToken);

    // Memory
    case 'pm.memory_recall':
      return handleMemoryRecall(params, accessToken);
    case 'pm.record_decision':
      return handleRecordDecision(params, accessToken);
    case 'pm.record_outcome':
      return handleRecordOutcome(params, accessToken);

    // Gates
    case 'pm.gate_configure':
      return handleGateConfigure(params, accessToken);
    case 'pm.gate_run':
      return handleGateRun(params, accessToken);
    case 'pm.gate_status':
      return handleGateStatus(params, accessToken);

    // Utility
    case 'pm.evidence_add':
      return handleEvidenceAdd(params, accessToken);

    // Plan Mode
    case 'pm.plan_import':
      return handlePlanImport(params, accessToken);
    case 'pm.plan_export':
      return handlePlanExport(params, accessToken);

    default:
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Unknown tool',
              message: `Tool "${toolName}" is not recognized.`,
            }),
          },
        ],
        isError: true,
      };
  }
}

