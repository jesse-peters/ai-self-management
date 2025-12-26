/**
 * @projectflow/core/server
 * Server-only exports (Node.js only)
 * 
 * Import from '@projectflow/core/server' for server-only functionality
 * that requires Node.js APIs (like child_process for gate command execution)
 */

// Export server-only gate functions
export {
  configureGates,
  listGates,
  getGate,
  runGate,  // This uses child_process
  getGateStatus,
  getLatestGateRun,
  listGateRuns,
} from './services/gates';

// Re-export types from the type-only file
export type {
  GateRunnerMode,
  GateRunStatus,
  GateConfigInput,
  GateStatusSummary,
} from './services/gatesTypes';

