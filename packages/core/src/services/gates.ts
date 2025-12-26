/**
 * Gates service - handles gate configuration, execution, and status tracking
 * 
 * Gates are verification checks that must pass before work can be considered complete.
 * They can be manual (human verification) or automated (command execution).
 */

import { createServerClient } from '@projectflow/db';
import type { Gate, GateRun, GateInsert, GateRunInsert } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';
import { getProject } from './projects';
import { emitEvent } from '../events';
import { analyzeCommand } from './dangerousCommands';
// Import types from separate file (safe for client-side)
import type {
  GateRunnerMode,
  GateRunStatus,
  GateConfigInput,
  GateStatusSummary,
} from './gatesTypes';

// Types are exported from gatesTypes.ts via services/index.ts
// Do not re-export here to avoid bundling this file on the client

// Lazy-loaded exec function (only loaded when needed, using dynamic import to avoid webpack bundling)
let execAsync: ((command: string, options?: { cwd?: string }) => Promise<{ stdout: string; stderr: string }>) | undefined;

/**
 * Configures gates for a project (upserts)
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param gates - Array of gate configurations
 * @param client - Optional authenticated Supabase client (required for RLS)
 * @returns Array of configured gates
 */
export async function configureGates(
  userId: string,
  projectId: string,
  gates: GateConfigInput[],
  client?: any
): Promise<Gate[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    if (!Array.isArray(gates) || gates.length === 0) {
      throw new ValidationError('gates must be a non-empty array', 'gates');
    }

    // Validate each gate
    for (const gate of gates) {
      if (!gate.name || gate.name.trim().length === 0) {
        throw new ValidationError('gate name is required', 'name');
      }

      if (gate.name.length > 100) {
        throw new ValidationError('gate name must be less than 100 characters', 'name');
      }

      const validModes: GateRunnerMode[] = ['manual', 'command'];
      if (!validModes.includes(gate.runner_mode)) {
        throw new ValidationError(
          `runner_mode must be one of: ${validModes.join(', ')}`,
          'runner_mode'
        );
      }

      if (gate.runner_mode === 'command' && !gate.command) {
        throw new ValidationError('command is required when runner_mode is "command"', 'command');
      }

      if (gate.command && gate.command.length > 1000) {
        throw new ValidationError('command must be less than 1000 characters', 'command');
      }

      // Check for dangerous commands when configuring gates
      if (gate.command) {
        const analysis = analyzeCommand(gate.command);
        if (analysis.isDangerous) {
          const severity = analysis.severity || 'high';
          const recommendations = analysis.recommendations.join('; ');
          throw new ValidationError(
            `Dangerous command detected (${severity}): ${analysis.message}. ${recommendations}`,
            'command'
          );
        }
      }
    }

    // Use provided authenticated client, or create a new one (for backward compatibility)
    const supabase = client || createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    const configuredGates: Gate[] = [];

    // Upsert each gate (update if exists, insert if not)
    for (const gateConfig of gates) {
      const { data: existingGate, error: checkError } = await (supabase as any)
        .from('gates')
        .select('id')
        .eq('project_id', projectId)
        .eq('name', gateConfig.name.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine
        throw mapSupabaseError(checkError);
      }

      if (existingGate) {
        // Update existing gate
        const { data: updatedGate, error: updateError } = await (supabase as any)
          .from('gates')
          .update({
            is_required: gateConfig.is_required,
            runner_mode: gateConfig.runner_mode,
            command: gateConfig.command?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingGate.id)
          .select()
          .single();

        if (updateError) {
          throw mapSupabaseError(updateError);
        }

        configuredGates.push(updatedGate as Gate);

        // Emit GateConfigured event
        await emitEvent({
          project_id: projectId,
          user_id: userId,
          event_type: 'GateConfigured',
          payload: {
            gate_id: updatedGate.id,
            gate_name: gateConfig.name,
            action: 'updated',
          },
        }, supabase);
      } else {
        // Insert new gate
        const { data: newGate, error: insertError } = await (supabase as any)
          .from('gates')
          .insert([
            {
              project_id: projectId,
              user_id: userId,
              name: gateConfig.name.trim(),
              is_required: gateConfig.is_required,
              runner_mode: gateConfig.runner_mode,
              command: gateConfig.command?.trim() || null,
            },
          ] as any)
          .select()
          .single();

        if (insertError) {
          throw mapSupabaseError(insertError);
        }

        configuredGates.push(newGate as Gate);

        // Emit GateConfigured event
        await emitEvent({
          project_id: projectId,
          user_id: userId,
          event_type: 'GateConfigured',
          payload: {
            gate_id: newGate.id,
            gate_name: gateConfig.name,
            action: 'created',
          },
        }, supabase);
      }
    }

    return configuredGates;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists all gates for a project
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param client - Optional authenticated Supabase client (required for RLS)
 * @returns Array of gates
 */
export async function listGates(
  userId: string,
  projectId: string,
  client?: any
): Promise<Gate[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Use provided authenticated client, or create a new one (for backward compatibility)
    const supabase = client || createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    const { data: gates, error } = await (supabase as any)
      .from('gates')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true });

    if (error) {
      throw mapSupabaseError(error);
    }

    return (gates || []) as Gate[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single gate by ID
 * 
 * @param userId - User ID
 * @param gateId - Gate ID
 * @param client - Optional authenticated Supabase client (required for RLS)
 * @returns The gate
 */
export async function getGate(
  userId: string,
  gateId: string,
  client?: any
): Promise<Gate> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(gateId, 'gateId');

    // Use provided authenticated client, or create a new one (for backward compatibility)
    const supabase = client || createServerClient();

    const { data: gate, error } = await (supabase as any)
      .from('gates')
      .select('*')
      .eq('id', gateId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!gate) {
      throw new NotFoundError('Gate not found');
    }

    return gate as Gate;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Runs a gate and stores the result
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param gateName - Name of the gate to run
 * @param options - Optional task_id or work_item_id
 * @param client - Optional authenticated Supabase client (required for RLS)
 * @returns The gate run result
 */
export async function runGate(
  userId: string,
  projectId: string,
  gateName: string,
  options?: {
    task_id?: string;
    work_item_id?: string;
    cwd?: string;
  },
  client?: any
): Promise<GateRun> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    if (!gateName || gateName.trim().length === 0) {
      throw new ValidationError('gateName is required', 'gateName');
    }

    if (options?.task_id) {
      validateUUID(options.task_id, 'task_id');
    }

    if (options?.work_item_id) {
      validateUUID(options.work_item_id, 'work_item_id');
    }

    // Use provided authenticated client, or create a new one (for backward compatibility)
    const supabase = client || createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    // Get the gate configuration
    const { data: gate, error: gateError } = await (supabase as any)
      .from('gates')
      .select('*')
      .eq('project_id', projectId)
      .eq('name', gateName.trim())
      .single();

    if (gateError || !gate) {
      throw new NotFoundError(`Gate "${gateName}" not found for this project`);
    }

    let status: GateRunStatus;
    let stdout: string | null = null;
    let stderr: string | null = null;
    let exitCode: number | null = null;

    if (gate.runner_mode === 'command' && gate.command) {
      // Check for dangerous commands before execution
      const analysis = analyzeCommand(gate.command);
      if (analysis.isDangerous) {
        const severity = analysis.severity || 'high';
        const recommendations = analysis.recommendations.join('; ');

        // Store gate run with blocked status
        const { data: gateRun, error: runError } = await (supabase as any)
          .from('gate_runs')
          .insert([
            {
              project_id: projectId,
              gate_id: gate.id,
              user_id: userId,
              task_id: options?.task_id || null,
              work_item_id: options?.work_item_id || null,
              status: 'failing' as GateRunStatus,
              stdout: null,
              stderr: `Command blocked: ${analysis.message}. ${recommendations}`,
              exit_code: null,
            },
          ] as any)
          .select()
          .single();

        if (runError) {
          throw mapSupabaseError(runError);
        }

        // Emit GateExecuted event for blocked command
        if (gateRun) {
          await emitEvent({
            project_id: projectId,
            user_id: userId,
            event_type: 'GateExecuted',
            payload: {
              gate_run_id: gateRun.id,
              gate_id: gate.id,
              gate_name: gate.name,
              status: 'failing',
              task_id: options?.task_id || null,
              work_item_id: options?.work_item_id || null,
              blocked: true,
              reason: analysis.message,
            },
          }, supabase);
        }

        throw new ValidationError(
          `Dangerous command blocked (${severity}): ${analysis.message}. ${recommendations}`,
          'command'
        );
      }

      // Execute the command (only available on server)
      // Use dynamic import with string concatenation to prevent static analysis
      if (!execAsync) {
        try {
          // Check if we're in a Node.js environment
          if (typeof process === 'undefined' || !process.versions?.node) {
            throw new ValidationError(
              'Command execution is not available in this environment. Gate commands can only be run on the server.',
              'runner_mode'
            );
          }
          // Use require with Function constructor to prevent bundlers from statically analyzing
          // This ensures webpack/turbopack won't try to bundle these modules
          const requireDynamic = new Function('module', 'return require(module)');
          const exec = requireDynamic('child_process').exec;
          const { promisify } = requireDynamic('util');
          execAsync = promisify(exec);
        } catch (importError) {
          throw new ValidationError(
            'Command execution is not available in this environment. Gate commands can only be run on the server.',
            'runner_mode'
          );
        }
      }

      if (!execAsync) {
        throw new ValidationError(
          'Command execution is not available in this environment. Gate commands can only be run on the server.',
          'runner_mode'
        );
      }

      try {
        const result = await execAsync(gate.command, {
          cwd: options?.cwd || process.cwd(),
        } as any);
        stdout = result.stdout || null;
        stderr = result.stderr || null;
        exitCode = 0;
        status = 'passing';
      } catch (execError: any) {
        stdout = execError.stdout || null;
        stderr = execError.stderr || execError.message;
        exitCode = execError.code || 1;
        status = 'failing';
      }
    } else {
      // Manual gate - default to passing (human needs to verify)
      status = 'passing';
      stdout = 'Manual gate run - verification pending';
    }

    // Store the gate run
    const { data: gateRun, error: runError } = await (supabase as any)
      .from('gate_runs')
      .insert([
        {
          project_id: projectId,
          gate_id: gate.id,
          user_id: userId,
          task_id: options?.task_id || null,
          work_item_id: options?.work_item_id || null,
          status,
          stdout,
          stderr,
          exit_code: exitCode,
        },
      ] as any)
      .select()
      .single();

    if (runError) {
      throw mapSupabaseError(runError);
    }

    if (!gateRun) {
      throw new NotFoundError('Failed to retrieve created gate run');
    }

    // Emit GateExecuted event
    await emitEvent({
      project_id: projectId,
      user_id: userId,
      event_type: 'GateExecuted',
      payload: {
        gate_run_id: gateRun.id,
        gate_id: gate.id,
        gate_name: gate.name,
        status,
        task_id: options?.task_id || null,
        work_item_id: options?.work_item_id || null,
      },
    }, supabase);

    return gateRun as GateRun;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets the latest gate status for all gates in a project
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param workItemId - Optional work item ID to filter runs
 * @param client - Optional authenticated Supabase client (required for RLS)
 * @returns Array of gate status summaries
 */
export async function getGateStatus(
  userId: string,
  projectId: string,
  workItemId?: string,
  client?: any
): Promise<GateStatusSummary[]> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    if (workItemId) {
      validateUUID(workItemId, 'workItemId');
    }

    // Use provided authenticated client, or create a new one (for backward compatibility)
    const supabase = client || createServerClient();

    // Verify user owns the project
    await getProject(supabase, projectId);

    // Get all gates for the project
    const gates = await listGates(userId, projectId, supabase);

    const statusSummaries: GateStatusSummary[] = [];

    for (const gate of gates) {
      // Get the latest run for this gate
      const latestRun = await getLatestGateRun(userId, gate.id, workItemId, supabase);

      statusSummaries.push({
        gate_id: gate.id,
        gate_name: gate.name,
        is_required: gate.is_required,
        runner_mode: gate.runner_mode,
        latest_run: latestRun
          ? {
            id: latestRun.id,
            status: latestRun.status,
            created_at: latestRun.created_at,
            stdout: latestRun.stdout,
            stderr: latestRun.stderr,
            exit_code: latestRun.exit_code,
          }
          : null,
      });
    }

    return statusSummaries;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets the latest gate run for a specific gate
 * 
 * @param userId - User ID
 * @param gateId - Gate ID
 * @param workItemId - Optional work item ID to filter runs
 * @param client - Optional authenticated Supabase client (required for RLS)
 * @returns The latest gate run or null
 */
export async function getLatestGateRun(
  userId: string,
  gateId: string,
  workItemId?: string,
  client?: any
): Promise<GateRun | null> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(gateId, 'gateId');

    if (workItemId) {
      validateUUID(workItemId, 'workItemId');
    }

    // Use provided authenticated client, or create a new one (for backward compatibility)
    const supabase = client || createServerClient();

    let query = (supabase as any)
      .from('gate_runs')
      .select('*')
      .eq('gate_id', gateId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (workItemId) {
      query = query.eq('work_item_id', workItemId);
    }

    const { data: runs, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return runs && runs.length > 0 ? (runs[0] as GateRun) : null;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists gate runs for a gate, work item, or task
 * 
 * @param userId - User ID
 * @param filters - Filters for gate runs
 * @returns Array of gate runs
 */
export async function listGateRuns(
  userId: string,
  filters: {
    gate_id?: string;
    work_item_id?: string;
    task_id?: string;
    status?: GateRunStatus;
    limit?: number;
  }
): Promise<GateRun[]> {
  try {
    validateUUID(userId, 'userId');

    if (filters.gate_id) {
      validateUUID(filters.gate_id, 'gate_id');
    }

    if (filters.work_item_id) {
      validateUUID(filters.work_item_id, 'work_item_id');
    }

    if (filters.task_id) {
      validateUUID(filters.task_id, 'task_id');
    }

    const supabase = createServerClient();

    let query = (supabase as any)
      .from('gate_runs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.gate_id) {
      query = query.eq('gate_id', filters.gate_id);
    }

    if (filters.work_item_id) {
      query = query.eq('work_item_id', filters.work_item_id);
    }

    if (filters.task_id) {
      query = query.eq('task_id', filters.task_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.limit && filters.limit > 0) {
      query = query.limit(filters.limit);
    }

    const { data: runs, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (runs || []) as GateRun[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

