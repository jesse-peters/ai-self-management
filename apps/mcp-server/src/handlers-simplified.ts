/**
 * MCP tool request handlers - Simplified
 * Handles the 11 core tools only
 */

import { resolveUserId } from './auth';
import { mapErrorToMCP, MCPErrorResponse } from './errors';
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
 * Handles create_constraint tool calls
 */
export async function handleCreateConstraint(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const result = await implementCreateConstraint(accessToken, params);
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
 * Handles evaluate_constraints tool calls
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
    
    // Tasks
    case 'pm.task_create':
      return handleTaskCreate(params, accessToken);
    case 'pm.task_set_status':
      return handleTaskSetStatus(params, accessToken);
    
    // Memory
    case 'pm.memory_recall':
      return handleMemoryRecall(params, accessToken);
    case 'pm.record_decision':
      return handleRecordDecision(params, accessToken);
    case 'pm.record_outcome':
      return handleRecordOutcome(params, accessToken);
    
    // Gates
    case 'pm.gate_run':
      return handleGateRun(params, accessToken);
    case 'pm.gate_status':
      return handleGateStatus(params, accessToken);
    
    // Advanced
    case 'pm.create_constraint':
      return handleCreateConstraint(params, accessToken);
    case 'pm.evaluate_constraints':
      return handleEvaluateConstraints(params, accessToken);
    
    // Utility
    case 'pm.evidence_add':
      return handleEvidenceAdd(params, accessToken);
    
    default:
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Unknown tool',
              message: `Tool "${toolName}" is not recognized. Available tools: pm.init, pm.status, pm.task_create, pm.task_set_status, pm.memory_recall, pm.record_decision, pm.record_outcome, pm.gate_run, pm.gate_status, pm.create_constraint, pm.evaluate_constraints, pm.evidence_add`,
            }),
          },
        ],
        isError: true,
      };
  }
}

