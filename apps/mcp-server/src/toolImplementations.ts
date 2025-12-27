/**
 * Tool implementation functions that wrap core services
 * All tools use the pm.* prefix
 */

import {
  initProject,
  getProjectStatus,
  recordDecision,
  recordOutcome,
  createConstraint,
  evaluateConstraints,
  recall,
  createAgentTask,
  updateTaskStatus,
  addEvidence,
  getInterviewQuestions,
  getProject,
  createWorkItem,
  listWorkItems,
  getWorkItem,
  updateWorkItemStatus,
  getAgentTask,
  importPlan,
  exportPlan,
  importProjectPlan,
  exportProjectPlan,
  generateProjectPlanTemplate,
  startWizard,
  submitWizardStep,
  finishWizard,
  recordTouchedFiles,
  ValidationError,
  type AgentTaskFilters,
  type InitResult,
  type ProjectStatus,
  type ManifestData,
  type PlanImportResult,
  type PlanExportResult,
  type ProjectPlanImportResult,
  type ProjectPlanExportResult,
} from '@projectflow/core';
// Import server-only functions from server module
import {
  readManifests,
  validateManifests,
  parseConventionsMarkdown,
  syncConventionsToPrimer,
  initProjectWithManifests,
  runGate,
  getGateStatus,
  configureGates,
  type InitProjectWithManifestsResult,
} from '@projectflow/core/server';
import type {
  AgentTask,
  Constraint,
  ConstraintContext,
  ConstraintEvaluationResult,
  DecisionRecordResult,
  Evidence,
  GateRun,
  GateStatusSummary,
  MemoryRecallContext,
  MemoryRecallResult,
  Outcome,
  Project,
  WorkItem,
  WorkItemSummary,
} from '@projectflow/core';
import { createServiceRoleClient, createOAuthScopedClient } from '@projectflow/db';
import { verifyAccessToken } from '@projectflow/core';

/**
 * Gets user ID from a Supabase auth token
 * Extracts user ID directly from verified token claims
 */
async function getUserFromToken(accessToken: string): Promise<string> {
  try {
    // Get the audience from environment or use a default
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const audience = `${apiUrl}/api/mcp`;

    // Verify token and extract user ID from claims
    const claims = await verifyAccessToken(accessToken, audience);

    if (!claims.sub) {
      throw new Error('Token does not contain user ID (sub claim)');
    }

    return claims.sub;
  } catch (error) {
    throw new Error(`Failed to get user from token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Authentication context returned by authenticateTool
 */
export interface AuthContext {
  userId: string;
  client: ReturnType<typeof createOAuthScopedClient>;
}

/**
 * Client type preference for authentication
 */
export type ClientType = 'oauth' | 'service-role';

/**
 * Consolidated authentication helper for all tool implementations
 * Extracts userId from token and creates appropriate Supabase client
 * 
 * This function standardizes authentication across all tools and ensures
 * consistent error handling and validation.
 * 
 * @param accessToken OAuth access token from MCP request
 * @param clientType Type of client to create ('oauth' for RLS-respecting, 'service-role' for admin)
 * @returns AuthContext with validated userId and Supabase client
 * @throws Error if token is invalid or userId cannot be extracted
 */
export async function authenticateTool(
  accessToken: string,
  clientType: ClientType = 'oauth'
): Promise<AuthContext> {
  // Extract and validate userId from token
  let userId: string;
  try {
    userId = await getUserFromToken(accessToken);
  } catch (error) {
    throw new Error(
      `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Validate userId is not empty
  if (!userId || userId.trim() === '') {
    throw new Error('Authentication failed: User ID is empty or invalid');
  }

  const validatedUserId = userId.trim();
  if (!validatedUserId) {
    throw new Error('Authentication failed: User ID validation failed');
  }

  // Create appropriate client based on type
  let client: ReturnType<typeof createOAuthScopedClient> | ReturnType<typeof createServiceRoleClient>;
  try {
    if (clientType === 'service-role') {
      client = createServiceRoleClient();
    } else {
      client = createOAuthScopedClient(accessToken);
    }
  } catch (error) {
    throw new Error(
      `Failed to create Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return {
    userId: validatedUserId,
    client: client as ReturnType<typeof createOAuthScopedClient>,
  };
}

/**
 * Implements pm.init tool
 * Quick project bootstrap with sensible defaults
 */
export async function implementInit(
  accessToken: string,
  params: Record<string, unknown>
): Promise<InitResult> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const result = await initProject(client, {
    name: params.name as string,
    description: params.description as string | undefined,
    skipGates: params.skipGates as boolean | undefined,
  }, userId);

  return result;
}

/**
 * Implements pm.status tool
 * Get comprehensive project status
 */
export async function implementStatus(
  accessToken: string,
  params: Record<string, unknown>
): Promise<ProjectStatus> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const result = await getProjectStatus(
    client,
    userId,
    params.projectId as string
  );

  return result;
}

/**
 * Implements pm.project_get tool
 */
export async function implementProjectGet(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Project> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  return getProject(client, params.projectId as string);
}

/**
 * Implements pm.record_decision tool
 */
export async function implementRecordDecision(
  accessToken: string,
  params: Record<string, unknown>
): Promise<DecisionRecordResult> {
  const { userId } = await authenticateTool(accessToken, 'oauth');
  return recordDecision(userId, params.projectId as string, {
    title: params.title as string,
    options: params.options as any[],
    choice: params.choice as string,
    rationale: params.rationale as string,
  });
}

/**
 * Implements pm.record_outcome tool
 */
export async function implementRecordOutcome(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Outcome> {
  const { userId } = await authenticateTool(accessToken, 'oauth');
  return recordOutcome(userId, params.projectId as string, {
    subject_type: params.subjectType as any,
    subject_id: params.subjectId as string,
    result: params.result as any,
    evidence_ids: params.evidenceIds as string[] | undefined,
    notes: params.notes as string | undefined,
    root_cause: params.rootCause as string | undefined,
    recommendation: params.recommendation as string | undefined,
    tags: params.tags as string[] | undefined,
    created_by: params.createdBy as any,
  });
}

/**
 * Implements pm.create_constraint tool
 */
export async function implementCreateConstraint(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Constraint> {
  const { userId } = await authenticateTool(accessToken, 'oauth');
  return createConstraint(userId, params.projectId as string, {
    scope: params.scope as any,
    scopeValue: params.scopeValue as string | undefined,
    trigger: params.trigger as any,
    triggerValue: params.triggerValue as string | undefined,
    ruleText: params.ruleText as string,
    enforcementLevel: params.enforcementLevel as any,
    sourceLinks: params.sourceLinks as any[] | undefined,
  });
}

/**
 * Implements pm.evaluate_constraints tool
 */
export async function implementEvaluateConstraints(
  accessToken: string,
  params: Record<string, unknown>
): Promise<ConstraintEvaluationResult> {
  const { userId } = await authenticateTool(accessToken, 'oauth');
  const context = params.context as ConstraintContext;
  return evaluateConstraints(userId, params.projectId as string, context);
}

/**
 * Implements pm.memory_recall tool
 */
export async function implementMemoryRecall(
  accessToken: string,
  params: Record<string, unknown>
): Promise<MemoryRecallResult> {
  const { userId } = await authenticateTool(accessToken, 'oauth');
  const context: MemoryRecallContext = {
    query: params.query as string | undefined,
    tags: params.tags as string[] | undefined,
    files: params.files as string[] | undefined,
    keywords: params.keywords as string[] | undefined,
  };
  return recall(userId, params.projectId as string, context);
}

// Work Items

/**
 * Implements pm.work_item_create tool
 */
export async function implementWorkItemCreate(
  accessToken: string,
  params: Record<string, unknown>
): Promise<WorkItem> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  return createWorkItem(client, params.projectId as string, {
    title: params.title as string,
    description: (params.description as string) || null,
    external_url: (params.externalUrl as string) || null,
    status: 'open',
    definition_of_done: null,
  });
}

/**
 * Implements pm.work_item_get tool
 */
export async function implementWorkItemGet(
  accessToken: string,
  params: Record<string, unknown>
): Promise<WorkItemSummary> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  return getWorkItem(client, params.workItemId as string);
}

/**
 * Implements pm.work_item_list tool
 */
export async function implementWorkItemList(
  accessToken: string,
  params: Record<string, unknown>
): Promise<WorkItemSummary[]> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  return listWorkItems(
    client,
    params.projectId as string,
    params.status as 'open' | 'in_progress' | 'done' | undefined
  );
}

/**
 * Implements pm.work_item_set_status tool
 */
export async function implementWorkItemSetStatus(
  accessToken: string,
  params: Record<string, unknown>
): Promise<WorkItem> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  return updateWorkItemStatus(
    client,
    params.workItemId as string,
    params.status as 'open' | 'in_progress' | 'done'
  );
}

// Agent Tasks

/**
 * Implements pm.task.create tool
 */
export async function implementAgentTaskCreate(
  accessToken: string,
  params: Record<string, unknown>
): Promise<AgentTask> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  return createAgentTask(client, params.projectId as string, {
    work_item_id: params.workItemId ? (params.workItemId as string) : null,
    type: params.type as 'research' | 'implement' | 'verify' | 'docs' | 'cleanup',
    title: params.title as string,
    goal: params.goal as string,
    context: params.context ? (params.context as string) : null,
    inputs: null,
    output_expectation: null,
    verification: params.verification ? (params.verification as string) : null,
    timebox_minutes: params.timeboxMinutes as number | undefined || 15,
    depends_on_ids: params.dependsOnIds as string[] | undefined || [],
    status: 'ready',
    risk: 'low',
    task_key: null,
    expected_files: [],
    touched_files: [],
    subtasks: null,
    gates: null,
  });
}

/**
 * Implements pm.task.set_status tool
 */
export async function implementAgentTaskSetStatus(
  accessToken: string,
  params: Record<string, unknown>
): Promise<AgentTask> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  return updateTaskStatus(
    client,
    params.taskId as string,
    params.status as 'ready' | 'doing' | 'blocked' | 'review' | 'done',
    params.blockedReason as string | undefined
  );
}

/**
 * Implements pm.task_record_touched_files tool
 */
export async function implementTaskRecordTouchedFiles(
  accessToken: string,
  params: Record<string, unknown>
): Promise<{
  task: AgentTask;
  comparison: {
    expected_and_touched: string[];
    missing_expected: string[];
    unexpected_touched: string[];
    warnings: string[];
  };
}> {
  const { client } = await authenticateTool(accessToken, 'oauth');

  let files: string[];

  if (params.autoDetect) {
    // Auto-detect using git diff (server-side only)
    // Check if we're in a Node.js environment before attempting import
    if (typeof process === 'undefined') {
      throw new ValidationError(
        'Auto-detect is only available in server environments. Please provide files explicitly.',
        'autoDetect'
      );
    }
    // Use require for server-side only code to avoid bundling issues
    // This is only executed server-side (checked above)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getChangedFiles } = require('./gitUtils');
      const changedFiles = await getChangedFiles(params.repoPath as string | undefined);
      files = changedFiles.all;
    } catch (error) {
      // If gitUtils can't be imported (e.g., in browser), throw a helpful error
      throw new ValidationError(
        'Auto-detect is only available in server environments. Please provide files explicitly.',
        'autoDetect'
      );
    }
  } else {
    files = params.files as string[];
    if (!Array.isArray(files)) {
      throw new ValidationError('files must be an array when autoDetect is false', 'files');
    }
  }

  return recordTouchedFiles(
    client,
    params.taskId as string,
    files
  );
}

/**
 * Implements pm.task_get tool
 */
export async function implementAgentTaskGet(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  return getAgentTask(client, params.taskId as string);
}

// Evidence

/**
 * Implements pm.evidence.add tool
 */
export async function implementEvidenceAdd(
  accessToken: string,
  params: Record<string, unknown>
): Promise<Evidence> {
  const { userId } = await authenticateTool(accessToken, 'oauth');

  return addEvidence(userId, params.projectId as string, {
    task_id: params.taskId as string | undefined,
    work_item_id: params.workItemId as string | undefined,
    type: params.type as 'note' | 'link' | 'log' | 'diff',
    content: params.content as string,
    created_by: 'agent',
  });
}

// Gates

/**
 * Implements pm.gate_configure tool
 */
export async function implementGateConfigure(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const gates = (params.gates as any[]).map((gate) => ({
    name: gate.name,
    description: gate.description || undefined,
    runner_mode: gate.runnerMode as 'manual' | 'command',
    command: gate.command || undefined,
    is_required: gate.isRequired || false,
  }));

  return configureGates(userId, params.projectId as string, gates, client);
}

/**
 * Implements pm.gate.run tool
 */
export async function implementGateRun(
  accessToken: string,
  params: Record<string, unknown>
): Promise<GateRun> {
  const { userId } = await authenticateTool(accessToken, 'oauth');

  return runGate(
    userId,
    params.projectId as string,
    params.gateName as string,
    {
      task_id: params.taskId as string | undefined,
      work_item_id: params.workItemId as string | undefined,
      cwd: params.cwd as string | undefined,
    }
  );
}

/**
 * Implements pm.gate.status tool
 */
export async function implementGateStatus(
  accessToken: string,
  params: Record<string, unknown>
): Promise<GateStatusSummary[]> {
  const { userId } = await authenticateTool(accessToken, 'oauth');

  return getGateStatus(
    userId,
    params.projectId as string,
    params.workItemId as string | undefined
  );
}

/**
 * Implements pm.manifest_discover tool
 * Discovers the .pm directory and returns project/user IDs
 */
export async function implementManifestDiscover(
  accessToken: string,
  params: Record<string, unknown>
): Promise<{
  found: boolean;
  projectId?: string;
  userId?: string;
  pmDir?: string;
}> {
  // Require auth for security and auditability
  const { userId } = await authenticateTool(accessToken, 'oauth');
  const startDir = (params.startDir as string) || process.cwd();

  const manifests = readManifests(startDir);

  if (!manifests) {
    return { found: false };
  }

  return {
    found: true,
    projectId: manifests.project.projectId,
    userId: manifests.local?.userId,
    pmDir: startDir,
  };
}

/**
 * Implements pm.manifest_validate tool
 * Validates manifest files and returns errors/warnings
 */
export async function implementManifestValidate(
  accessToken: string,
  params: Record<string, unknown>
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  // Require auth for security and auditability
  const { userId } = await authenticateTool(accessToken, 'oauth');
  const startDir = (params.startDir as string) || process.cwd();

  return validateManifests(startDir);
}

/**
 * Implements pm.manifest_read tool
 * Reads and returns full manifest data
 */
export async function implementManifestRead(
  accessToken: string,
  params: Record<string, unknown>
): Promise<ManifestData | { error: string }> {
  // Require auth for security and auditability
  const { userId } = await authenticateTool(accessToken, 'oauth');
  const startDir = (params.startDir as string) || process.cwd();

  const manifests = readManifests(startDir);

  if (!manifests) {
    return { error: 'No manifests found. Run pm.init with repoRoot parameter to create them.' };
  }

  return manifests;
}

/**
 * Implements pm.interview_questions tool
 * Returns the list of interview questions for project setup
 */
export async function implementInterviewQuestions(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  // Require auth even though we don't use userId/client
  const { userId } = await authenticateTool(accessToken, 'oauth');

  return {
    questions: getInterviewQuestions(),
  };
}

/**
 * Implements pm.init_with_interview tool
 * Initializes a project and saves interview responses as conventions
 * If repoRoot is provided, also creates manifests and primer
 */
export async function implementInitWithInterview(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  // Use consolidated auth helper - it handles validation
  let validatedUserId: string;
  let client: ReturnType<typeof createOAuthScopedClient>;

  try {
    const authResult = await authenticateTool(accessToken, 'oauth');
    validatedUserId = authResult.userId;
    client = authResult.client;

    // Log authentication success for debugging
    console.log('[pm.init_with_interview] Authentication successful', {
      userId: validatedUserId,
      hasRepoRoot: !!params.repoRoot,
      projectName: params.name,
    });
  } catch (authError) {
    // Capture authentication failure with detailed context
    const error = authError instanceof Error ? authError : new Error(String(authError));
    console.error('[pm.init_with_interview] Authentication failed', {
      error: error.message,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none',
    });

    // Re-throw with more context
    throw new Error(`Authentication failed: ${error.message}`);
  }

  // Validate userId is present and not empty
  if (!validatedUserId || validatedUserId.trim() === '') {
    const error = new Error('User authentication required: userId is empty or invalid after authentication');
    console.error('[pm.init_with_interview] Invalid userId after authentication', {
      userId: validatedUserId,
      userIdType: typeof validatedUserId,
    });
    throw error;
  }

  // If repoRoot is provided, use the server-only function that handles manifests
  if (params.repoRoot) {
    try {
      // Final validation before calling
      if (!validatedUserId || typeof validatedUserId !== 'string' || validatedUserId.trim() === '') {
        throw new Error(`CRITICAL: validatedUserId is invalid before initProjectWithManifests call: ${JSON.stringify({ validatedUserId, type: typeof validatedUserId })}`);
      }

      console.log('[pm.init_with_interview] Calling initProjectWithManifests', {
        userId: validatedUserId,
        userIdLength: validatedUserId.length,
        userIdPreview: `${validatedUserId.substring(0, 8)}...`,
        repoRoot: params.repoRoot,
      });

      const result: InitProjectWithManifestsResult = await initProjectWithManifests(client, {
        name: params.name as string,
        description: params.description as string | undefined,
        skipGates: params.skipGates as boolean | undefined,
        repoRoot: params.repoRoot as string,
        interviewResponses: params.interviewResponses as Record<string, unknown>,
      }, validatedUserId);

      return {
        project: result.project,
        gates: result.gates,
        message: result.message,
        conventions: result.conventions,
        reconProfile: result.reconProfile,
        manifestPaths: result.manifestPaths,
        primerPath: result.primerPath,
      };
    } catch (initError) {
      console.error('[pm.init_with_interview] initProjectWithManifests failed', {
        error: initError instanceof Error ? initError.message : String(initError),
        userId: validatedUserId,
        repoRoot: params.repoRoot,
      });
      throw initError;
    }
  }

  // Otherwise, use the browser-safe version
  try {
    console.log('[pm.init_with_interview] Calling initProject (browser-safe)', {
      userId: validatedUserId,
    });

    const result = await initProject(client, {
      name: params.name as string,
      description: params.description as string | undefined,
      skipGates: params.skipGates as boolean | undefined,
      interviewResponses: params.interviewResponses as Record<string, unknown>,
    }, validatedUserId);

    return {
      project: result.project,
      gates: result.gates,
      message: result.message,
      conventions: result.conventions,
      reconProfile: result.reconProfile,
    };
  } catch (initError) {
    console.error('[pm.init_with_interview] initProject failed', {
      error: initError instanceof Error ? initError.message : String(initError),
      userId: validatedUserId,
    });
    throw initError;
  }
}

/**
 * Implements pm.project_conventions_get tool
 * Retrieves stored project conventions
 */
export async function implementProjectConventionsGet(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  // Use consolidated auth helper
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const projectId = params.projectId as string;

  if (!projectId) {
    throw new Error('projectId is required');
  }

  // Get project with conventions
  const { data: project, error } = await (client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single() as any);

  if (error) {
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  if (!project) {
    throw new Error('Project not found');
  }

  return {
    projectId: project.id,
    projectName: project.name,
    conventions: project.conventions_markdown,
  };
}

/**
 * Implements pm.conventions_sync_to_primer tool
 * Syncs stored conventions from SaaS to local primer file
 */
export async function implementConventionsSyncToPrimer(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');
  const projectId = params.projectId as string;
  const repoRoot = (params.repoRoot as string) || process.cwd();

  if (!projectId) {
    throw new Error('projectId is required');
  }

  // Get project with conventions
  const { data: project, error } = await (client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single() as any);

  if (error) {
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  if (!project) {
    throw new Error('Project not found');
  }

  if (!project.conventions_markdown) {
    return {
      success: false,
      message: 'No conventions stored for this project. Run pm.init_with_interview first.',
    };
  }

  // Use dynamic imports for path module
  const { join: pathJoin } = await import('path');
  const { existsSync } = await import('fs');

  // Discover the .pm directory
  let pmDir: string;
  try {
    // Check if .pm directory exists
    const possiblePmDir = pathJoin(repoRoot, '.pm');
    if (existsSync(possiblePmDir)) {
      pmDir = possiblePmDir;
    } else {
      throw new Error(`.pm directory not found at ${possiblePmDir}`);
    }
  } catch (err) {
    throw new Error(`Failed to locate .pm directory: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Parse conventions from markdown
  const conventions = parseConventionsMarkdown(project.conventions_markdown);
  if (!conventions) {
    throw new Error('Failed to parse project conventions');
  }

  // Sync to primer
  const result = syncConventionsToPrimer(pmDir, conventions);

  return {
    success: true,
    path: result.path,
    created: result.created,
    updated: result.updated,
    message: `Conventions synced to ${result.path}${result.created ? ' (new file)' : result.updated ? ' (updated)' : ' (no changes)'}`,
  };
}

/**
 * Implements pm.plan_import tool
 * Imports a plan file for a work item, creating/updating tasks
 */
export async function implementPlanImport(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const workItemId = params.workItemId as string;
  const planText = params.planText as string;

  if (!workItemId) {
    throw new Error('workItemId is required');
  }

  if (!planText) {
    throw new Error('planText is required');
  }

  // Import the plan
  const result: PlanImportResult = await importPlan(client, workItemId, planText);

  return {
    workItemId: result.workItemId,
    workItemTitle: result.workItem.title,
    tasksCreated: result.tasksCreated,
    tasksUpdated: result.tasksUpdated,
    taskMappings: result.taskMappings,
    message: `Plan imported: ${result.tasksCreated} tasks created, ${result.tasksUpdated} tasks updated`,
  };
}

/**
 * Implements pm.plan_export tool
 * Exports a work item's tasks as a plan file
 */
export async function implementPlanExport(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const workItemId = params.workItemId as string;

  if (!workItemId) {
    throw new Error('workItemId is required');
  }

  // Get app URL from environment or use fallback
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  // Export the plan with options
  const result: PlanExportResult = await exportPlan(client, workItemId, {
    userId,
    appUrl,
  });

  return {
    workItemId,
    plan: result.plan,
    content: result.content,
  };
}

/**
 * Implements pm.project_plan_import tool
 * Imports a project plan file, creating/updating tasks
 */
export async function implementProjectPlanImport(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const projectId = params.projectId as string;
  const planText = params.planText as string;
  const planPath = (params.planPath as string) || './.pm/plan.md';

  if (!projectId) {
    throw new Error('projectId is required');
  }

  if (!planText) {
    throw new Error('planText is required');
  }

  // Import the plan
  const result: ProjectPlanImportResult = await importProjectPlan(
    client,
    projectId,
    planText,
    planPath
  );

  return {
    projectId: result.projectId,
    tasksCreated: result.tasksCreated,
    tasksUpdated: result.tasksUpdated,
    taskMappings: result.taskMappings,
    warnings: result.warnings,
    message: `Plan imported: ${result.tasksCreated} tasks created, ${result.tasksUpdated} tasks updated`,
  };
}

/**
 * Implements pm.project_plan_export tool
 * Exports a project's tasks as a plan file with metadata annotations
 */
export async function implementProjectPlanExport(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const projectId = params.projectId as string;

  if (!projectId) {
    throw new Error('projectId is required');
  }

  // Export the plan
  const result: ProjectPlanExportResult = await exportProjectPlan(client, projectId);

  return {
    projectId,
    plan: result.plan,
    content: result.content,
  };
}

/**
 * Implements pm.wizard_start tool
 * Starts a new project setup wizard session
 */
export async function implementWizardStart(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  // Start wizard session
  const sessionId = await startWizard(client);

  // Get session to return current step
  const { getWizardSession } = await import('@projectflow/core');
  const session = getWizardSession(sessionId);

  return {
    sessionId,
    currentStep: session.step,
    message: 'Wizard session started. Use pm.wizard_step to submit data for each step.',
  };
}

/**
 * Implements pm.wizard_step tool
 * Submits data for a wizard step and advances to next step
 */
export async function implementWizardStep(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const sessionId = params.sessionId as string;
  const stepId = params.stepId as number;
  const payload = params.payload as Record<string, unknown>;

  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  if (!stepId || stepId < 1 || stepId > 5) {
    throw new Error('stepId must be between 1 and 5');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('payload is required and must be an object');
  }

  // Submit wizard step (no client parameter needed - uses in-memory sessions)
  const result = await submitWizardStep(sessionId, stepId, payload);

  return {
    sessionId,
    nextStep: result.nextStep,
    session: result.session,
    message: result.nextStep === 'complete'
      ? 'Wizard complete. Use pm.wizard_finish to create the project.'
      : `Step ${stepId} submitted. Next step: ${result.nextStep}`,
  };
}

/**
 * Implements pm.wizard_finish tool
 * Finishes wizard and creates project with spec, tasks, gates, checkpoint, and plan file
 */
export async function implementWizardFinish(
  accessToken: string,
  params: Record<string, unknown>
): Promise<any> {
  const { userId, client } = await authenticateTool(accessToken, 'oauth');

  const sessionId = params.sessionId as string;

  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  // Finish wizard and create project
  const result = await finishWizard(client, sessionId);

  // Generate initial plan file
  let planContent: string | null = null;
  try {
    planContent = await generateProjectPlanTemplate(client, result.project.id);

    // Update project spec with plan path
    const { updateProjectSpecPlanMetadata } = await import('@projectflow/core');
    await updateProjectSpecPlanMetadata(
      client,
      result.project.id,
      './.pm/plan.md',
      undefined,
      undefined,
      undefined
    );
  } catch (error) {
    // Log but don't fail - plan generation is optional
    console.warn('Failed to generate plan file:', error);
  }

  return {
    project: result.project,
    projectSpec: result.projectSpec,
    tasks: result.tasks,
    checkpoint: result.checkpoint,
    planContent,
    message: `Project created successfully with ${result.tasks.length} initial tasks. Plan file template generated.`,
  };
}
