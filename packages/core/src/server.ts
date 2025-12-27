/**
 * @projectflow/core/server
 * Server-only exports (Node.js only)
 * 
 * Import from '@projectflow/core/server' for server-only functionality
 * that requires Node.js APIs (like child_process for gate command execution,
 * and file I/O for manifests, primers, and recon)
 */

// Export server-only initialization functions (file I/O dependent)
export { initProjectWithManifests, type InitProjectWithManifestsOptions, type InitProjectWithManifestsResult } from './services/initServer';

// Export server-only gate functions
export {
  configureGates,
  listGates,
  getGate,
  runGate,  // This uses child_process
  getGateStatus,
  getLatestGateRun,
  listGateRuns,
  waiveGate,
  getGateWaivers,
  canWaiveGate,
  type GateWaiver,
} from './services/gates';

// Export server-only manifest functions (file I/O)
export {
  discoverManifestDir,
  readProjectManifest,
  readLocalManifest,
  readManifests,
  writeProjectManifest,
  writeLocalManifest,
  updateLocalManifestSyncTime,
  updateProjectManifest,
  ensureGitignore,
  initializeManifests,
  getProjectIdFromManifest,
  getUserIdFromManifest,
  validateManifests,
  readReconProfile,
  writeReconProfile,
  updateReconProfile,
  hasReconProfile,
  type ProjectManifest,
  type LocalManifest,
  type ManifestData,
} from './services/manifest';

// Export server-only recon functions (file I/O and child_process)
export {
  loadReconProfile,
  saveReconProfile,
  generateReconProfileYAML,
  executeReconCommand,
  executeReconProfile,
  executeRecon,
  discoverFiles,
  generateTreeSummary,
  generateReconSummary,
  validateReconProfile,
  type ReconCommandResult,
  type ReconExecutionResult,
  type ReconFileResult,
} from './services/recon';

// Export server-only primer functions (file I/O)
export {
  generateMachineSection,
  generateUserSection,
  readPrimer,
  parsePrimerContent,
  generatePrimerContent,
  generatePrimer,
  refreshPrimer,
  syncConventionsToPrimer,
  getUserSection,
  updateUserSection,
  checkPrimerStatus,
  type PrimerGenerationResult,
  type PrimerContent,
} from './services/primer';

// Export server-only convention functions (file I/O)
export {
  getProjectConventions,
  parseConventionsMarkdown,
} from './services/interview';

// Re-export types from the type-only file
export type {
  GateRunnerMode,
  GateRunStatus,
  GateConfigInput,
  GateStatusSummary,
} from './services/gatesTypes';

