/**
 * Gates type definitions
 * Extracted to separate file to allow importing in client-side code
 * without pulling in Node.js dependencies from gates.ts
 */

/**
 * Valid gate runner modes
 */
export type GateRunnerMode = 'manual' | 'command';

/**
 * Valid gate run statuses
 */
export type GateRunStatus = 'passing' | 'failing';

/**
 * Gate configuration data for create/update operations
 */
export interface GateConfigInput {
  name: string;
  is_required: boolean;
  runner_mode: GateRunnerMode;
  command?: string;
}

/**
 * Gate status summary for a project/work item
 */
export interface GateStatusSummary {
  gate_id: string;
  gate_name: string;
  is_required: boolean;
  runner_mode: GateRunnerMode;
  latest_run?: {
    id: string;
    status: GateRunStatus;
    created_at: string;
    stdout: string | null;
    stderr: string | null;
    exit_code: number | null;
  } | null;
}

