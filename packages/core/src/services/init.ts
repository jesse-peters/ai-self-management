/**
 * Initialization service - handles quick project bootstrap
 * 
 * Provides pm.init functionality for one-call project setup with sensible defaults
 * Also supports interactive interview mode to capture project conventions
 * 
 * NOTE: Manifest and primer initialization require file system access and are
 * in server.ts (import from '@projectflow/core/server')
 */

import type { Project, Gate } from '@projectflow/db';
import { createProject } from './projects';
import { configureGates } from './gates';
import { saveProjectConventions, processInterviewResponses, generateReconProfile } from './interview';
import type { Database } from '@projectflow/db';
import type { ProjectConventions, ReconProfile } from './interview';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Result of initialization (basic project creation only)
 */
export interface InitResult {
  project: Project;
  gates: Gate[];
  message: string;
  conventions?: ProjectConventions;
  reconProfile?: ReconProfile;
}

/**
 * Initialization options
 */
export interface InitOptions {
  name: string;
  description?: string;
  skipGates?: boolean;
  interviewResponses?: Record<string, unknown>; // Pre-filled interview responses (for non-interactive mode)
}

/**
 * Initializes a new project with sensible defaults
 * 
 * Creates a project and sets up basic gates (tests, lint) automatically.
 * This is the fastest way to get started.
 * 
 * If interviewResponses is provided, captures project conventions
 * through an interview and stores them in the project for use during recon/primer generation.
 * 
 * For manifest and primer initialization (which require file I/O), import from '@projectflow/core/server'
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param options Initialization options
 * @param userId Optional user ID (extracted from token in MCP context)
 * @returns Project and configured gates
 */
export async function initProject(
  client: SupabaseClient<Database>,
  options: InitOptions,
  userId?: string
): Promise<InitResult> {
  // Get userId from parameter or auth context
  let finalUserId = userId;
  if (!finalUserId) {
    const { data: { user }, error: userError } = await client.auth.getUser();
    finalUserId = user?.id;
  }

  if (!finalUserId) {
    throw new Error('User authentication required');
  }

  // Create the project
  const project = await createProject(client, {
    name: options.name,
    description: options.description || 'Managed by ProjectFlow',
  }, finalUserId);

  let gates: Gate[] = [];

  // Configure default gates unless skipped
  if (!options.skipGates) {
    gates = await configureGates(finalUserId, project.id, [
      {
        name: 'tests',
        is_required: false,
        runner_mode: 'command',
        command: 'npm test',
      },
      {
        name: 'lint',
        is_required: false,
        runner_mode: 'command',
        command: 'npm run lint',
      },
      {
        name: 'review',
        is_required: false,
        runner_mode: 'manual',
      },
    ]);
  }

  let result: InitResult = {
    project,
    gates,
    message: `Project "${project.name}" initialized successfully. ${gates.length} gates configured.`,
  };

  // Handle interview mode to capture conventions
  if (options.interviewResponses) {
    try {
      const conventions = processInterviewResponses(options.interviewResponses);
      const reconProfile = generateReconProfile(conventions);

      // Save conventions to project
      await saveProjectConventions(client, project.id, conventions);

      result.conventions = conventions;
      result.reconProfile = reconProfile;
      result.message += ' Project conventions captured from interview.';
    } catch (error) {
      // If interview processing fails, log but don't block the init process
      console.error('Failed to process interview responses:', error);
    }
  }

  return result;
}
