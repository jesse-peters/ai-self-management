/**
 * MCP tool request handlers
 */

import { resolveUserId } from './auth';
import { mapErrorToMCP, MCPErrorResponse } from './errors';
import {
  implementInit,
  implementStatus,
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
  implementRecordOutcome,
  implementCreateConstraint,
  implementListConstraints,
  implementEvaluateConstraints,
  implementAssertInScope,
  implementMemoryRecall,
  implementWizardStart,
  implementWizardStep,
  implementWizardFinish,
  implementWorkItemCreate,
  implementWorkItemList,
  implementWorkItemGet,
  implementWorkItemSetStatus,
  implementAgentTaskCreate,
  implementAgentTaskList,
  implementAgentTaskGet,
  implementAgentTaskSetStatus,
  implementAgentTaskAddDependency,
  implementEvidenceAdd,
  implementEvidenceList,
  implementGateConfigure,
  implementGateRun,
  implementGateStatus,
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
 * Handles create_project tool calls
 */
export async function handleCreateProject(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const project = await implementCreateProject(accessToken, params);
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const projects = await implementListProjects(accessToken);
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementCreateTask(accessToken, params);
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const tasks = await implementListTasks(accessToken, params);
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementUpdateTask(accessToken, params);
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
    const decision = await implementRecordDecision(accessToken, params);
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
 * Handles pm.record_outcome tool calls
 */
export async function handleRecordOutcome(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const outcome = await implementRecordOutcome(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(outcome, null, 2),
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
 * Handles pm.memory_recall tool calls
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
 * Handles wizard_start tool calls
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
 * Handles wizard_step tool calls
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
 * Handles wizard_finish tool calls
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

// Work Items

/**
 * Handles work_item.create tool calls
 */
export async function handleWorkItemCreate(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const workItem = await implementWorkItemCreate(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(workItem, null, 2),
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
 * Handles work_item.list tool calls
 */
export async function handleWorkItemList(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const workItems = await implementWorkItemList(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(workItems, null, 2),
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
 * Handles work_item.get tool calls
 */
export async function handleWorkItemGet(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const workItem = await implementWorkItemGet(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(workItem, null, 2),
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
 * Handles work_item.set_status tool calls
 */
export async function handleWorkItemSetStatus(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const workItem = await implementWorkItemSetStatus(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(workItem, null, 2),
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

// Agent Tasks

/**
 * Handles task.create tool calls
 */
export async function handleAgentTaskCreate(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementAgentTaskCreate(accessToken, params);
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
 * Handles task.list tool calls
 */
export async function handleAgentTaskList(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const tasks = await implementAgentTaskList(accessToken, params);
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
 * Handles task.get tool calls
 */
export async function handleAgentTaskGet(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementAgentTaskGet(accessToken, params);
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
 * Handles task.set_status tool calls
 */
export async function handleAgentTaskSetStatus(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementAgentTaskSetStatus(accessToken, params);
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
 * Handles task.add_dependency tool calls
 */
export async function handleAgentTaskAddDependency(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const task = await implementAgentTaskAddDependency(accessToken, params);
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

// Evidence

/**
 * Handles evidence.add tool calls
 */
export async function handleEvidenceAdd(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const evidence = await implementEvidenceAdd(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(evidence, null, 2),
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
 * Handles evidence.list tool calls
 */
export async function handleEvidenceList(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const evidence = await implementEvidenceList(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(evidence, null, 2),
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

// Gates

/**
 * Handles gate.configure tool calls
 */
export async function handleGateConfigure(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const gates = await implementGateConfigure(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(gates, null, 2),
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
 * Handles gate.run tool calls
 */
export async function handleGateRun(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const gateRun = await implementGateRun(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(gateRun, null, 2),
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
 * Handles gate.status tool calls
 */
export async function handleGateStatus(
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  try {
    const status = await implementGateStatus(accessToken, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2),
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
  params: Record<string, unknown>,
  accessToken: string
): Promise<ToolCallResult> {
  switch (toolName) {
    case 'pm.init':
      return handleInit(params, accessToken);
    case 'pm.status':
      return handleStatus(params, accessToken);
    case 'pm.create_project':
      return handleCreateProject(params, accessToken);
    case 'pm.list_projects':
      return handleListProjects(params, accessToken);
    case 'pm.create_task':
      return handleCreateTask(params, accessToken);
    case 'pm.list_tasks':
      return handleListTasks(params, accessToken);
    case 'pm.update_task':
      return handleUpdateTask(params, accessToken);
    case 'pm.get_context':
      return handleGetContext(params, accessToken);
    case 'pm.pick_next_task':
      return handlePickNextTask(params, accessToken);
    case 'pm.start_task':
      return handleStartTask(params, accessToken);
    case 'pm.block_task':
      return handleBlockTask(params, accessToken);
    case 'pm.append_artifact':
      return handleAppendArtifact(params, accessToken);
    case 'pm.evaluate_gates':
      return handleEvaluateGates(params, accessToken);
    case 'pm.complete_task':
      return handleCompleteTask(params, accessToken);
    case 'pm.create_checkpoint':
      return handleCreateCheckpoint(params, accessToken);
    case 'pm.record_decision':
      return handleRecordDecision(params, accessToken);
    case 'pm.record_outcome':
      return handleRecordOutcome(params, accessToken);
    case 'pm.create_constraint':
      return handleCreateConstraint(params, accessToken);
    case 'pm.list_constraints':
      return handleListConstraints(params, accessToken);
    case 'pm.evaluate_constraints':
      return handleEvaluateConstraints(params, accessToken);
    case 'pm.assert_in_scope':
      return handleAssertInScope(params, accessToken);
    case 'pm.memory_recall':
      return handleMemoryRecall(params, accessToken);
    case 'pm.wizard_start':
      return handleWizardStart(params, accessToken);
    case 'pm.wizard_step':
      return handleWizardStep(params, accessToken);
    case 'pm.wizard_finish':
      return handleWizardFinish(params, accessToken);
    // Work Items
    case 'pm.work_item.create':
      return handleWorkItemCreate(params, accessToken);
    case 'pm.work_item.list':
      return handleWorkItemList(params, accessToken);
    case 'pm.work_item.get':
      return handleWorkItemGet(params, accessToken);
    case 'pm.work_item.set_status':
      return handleWorkItemSetStatus(params, accessToken);
    // Agent Tasks
    case 'pm.task.create':
      return handleAgentTaskCreate(params, accessToken);
    case 'pm.task.list':
      return handleAgentTaskList(params, accessToken);
    case 'pm.task.get':
      return handleAgentTaskGet(params, accessToken);
    case 'pm.task.set_status':
      return handleAgentTaskSetStatus(params, accessToken);
    case 'pm.task.add_dependency':
      return handleAgentTaskAddDependency(params, accessToken);
    // Evidence
    case 'pm.evidence.add':
      return handleEvidenceAdd(params, accessToken);
    case 'pm.evidence.list':
      return handleEvidenceList(params, accessToken);
    // Gates
    case 'pm.gate.configure':
      return handleGateConfigure(params, accessToken);
    case 'pm.gate.run':
      return handleGateRun(params, accessToken);
    case 'pm.gate.status':
      return handleGateStatus(params, accessToken);
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

