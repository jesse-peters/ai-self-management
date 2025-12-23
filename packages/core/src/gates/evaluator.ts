/**
 * Gate evaluator - evaluates quality gates for tasks
 */

import type { Gate, GateResult, ProjectRules } from '../types';
import { listArtifacts } from '../services/artifacts';
import { getTask } from '../services/tasks';
import { getProject } from '../services/projects';

/**
 * Evaluates all gates for a task
 * 
 * @param userId - User ID
 * @param taskId - Task ID to evaluate gates for
 * @param gates - Optional list of gates to evaluate. If not provided, uses default gates from project rules or hardcoded defaults.
 * @returns Array of gate evaluation results
 */
export async function evaluateGates(
  userId: string,
  taskId: string,
  gates?: Gate[]
): Promise<GateResult[]> {
  // Get task to access acceptance criteria and other metadata
  const task = await getTask(userId, taskId);
  const taskData = task as any;

  // If no gates provided, load default gates from project rules
  if (!gates || gates.length === 0) {
    const project = await getProject(userId, task.project_id);
    const projectData = project as any;
    const projectRules: ProjectRules = (projectData.rules || {}) as ProjectRules;

    // Parse default gates from project rules
    if (projectRules.defaultGates && projectRules.defaultGates.length > 0) {
      gates = parseGatesFromStrings(projectRules.defaultGates);
    } else {
      // Fall back to hardcoded defaults
      gates = [
        { type: 'has_artifacts', config: { minCount: 1 } },
        { type: 'acceptance_met', config: {} },
      ];
    }
  }

  const results: GateResult[] = [];

  // Get artifacts for the task
  const artifacts = await listArtifacts(userId, taskId);

  for (const gate of gates) {
    const result = await evaluateGate(gate, taskData, artifacts);
    results.push(result);
  }

  return results;
}

/**
 * Parses gate strings from project rules into Gate objects
 * 
 * Supports formats like:
 * - "has_tests"
 * - "has_docs"
 * - "has_artifacts:minCount=2"
 * - "acceptance_met"
 * 
 * @param gateStrings - Array of gate string definitions
 * @returns Array of Gate objects
 */
function parseGatesFromStrings(gateStrings: string[]): Gate[] {
  const gates: Gate[] = [];

  for (const gateStr of gateStrings) {
    const [type, configStr] = gateStr.split(':');
    
    if (!type || !isValidGateType(type)) {
      // Skip invalid gate types
      continue;
    }

    const gate: Gate = {
      type: type as Gate['type'],
    };

    // Parse config if present (e.g., "has_artifacts:minCount=2")
    if (configStr) {
      const config: Record<string, any> = {};
      const pairs = configStr.split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          // Try to parse as number if possible
          const numValue = Number(value);
          config[key.trim()] = isNaN(numValue) ? value.trim() : numValue;
        }
      }
      if (Object.keys(config).length > 0) {
        gate.config = config;
      }
    }

    gates.push(gate);
  }

  return gates;
}

/**
 * Validates that a gate type string is valid
 */
function isValidGateType(type: string): type is Gate['type'] {
  return ['has_tests', 'has_docs', 'has_artifacts', 'acceptance_met', 'custom'].includes(type);
}

/**
 * Evaluates a single gate
 */
async function evaluateGate(
  gate: Gate,
  task: any,
  artifacts: any[]
): Promise<GateResult> {
  switch (gate.type) {
    case 'has_tests': {
      const testArtifacts = artifacts.filter(a => a.type === 'test_report');
      const passed = testArtifacts.length > 0;
      return {
        passed,
        gate,
        reason: passed
          ? `Found ${testArtifacts.length} test artifact(s)`
          : 'No test artifacts found',
        missingRequirements: passed ? undefined : ['test_report artifact'],
      };
    }

    case 'has_docs': {
      const docArtifacts = artifacts.filter(a => a.type === 'document');
      const passed = docArtifacts.length > 0;
      return {
        passed,
        gate,
        reason: passed
          ? `Found ${docArtifacts.length} document artifact(s)`
          : 'No document artifacts found',
        missingRequirements: passed ? undefined : ['document artifact'],
      };
    }

    case 'has_artifacts': {
      const minCount = gate.config?.minCount || 1;
      const passed = artifacts.length >= minCount;
      return {
        passed,
        gate,
        reason: passed
          ? `Found ${artifacts.length} artifact(s) (required: ${minCount})`
          : `Only ${artifacts.length} artifact(s) found (required: ${minCount})`,
        missingRequirements: passed
          ? undefined
          : [`At least ${minCount} artifact(s) required`],
      };
    }

    case 'acceptance_met': {
      const acceptanceCriteria = task.acceptance_criteria || [];
      // For now, we assume acceptance criteria are met if they exist
      // In a full implementation, this might check against artifacts or other evidence
      const passed = acceptanceCriteria.length === 0 || artifacts.length > 0;
      return {
        passed,
        gate,
        reason: passed
          ? 'Acceptance criteria appear to be met'
          : 'Acceptance criteria not yet met',
        missingRequirements: passed
          ? undefined
          : ['Evidence that acceptance criteria are met'],
      };
    }

    case 'custom': {
      // Custom gates would need custom evaluation logic
      // For now, default to passed
      return {
        passed: true,
        gate,
        reason: 'Custom gate evaluation not implemented',
      };
    }

    default:
      return {
        passed: false,
        gate,
        reason: `Unknown gate type: ${(gate as any).type}`,
        missingRequirements: ['Valid gate type'],
      };
  }
}

