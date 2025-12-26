/**
 * Initialization service - handles quick project bootstrap
 * 
 * Provides pm.init functionality for one-call project setup with sensible defaults
 */

import type { Project, Gate } from '@projectflow/db';
import { createProject } from './projects';
import { configureGates } from './gates';
import type { Database } from '@projectflow/db';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Result of initialization
 */
export interface InitResult {
  project: Project;
  gates: Gate[];
  message: string;
}

/**
 * Initialization options
 */
export interface InitOptions {
  name: string;
  description?: string;
  skipGates?: boolean;
}

/**
 * Initializes a new project with sensible defaults
 * 
 * Creates a project and sets up basic gates (tests, lint) automatically.
 * This is the fastest way to get started.
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param options Initialization options
 * @returns Project and configured gates
 */
export async function initProject(
  client: SupabaseClient<Database>,
  options: InitOptions
): Promise<InitResult> {
  // Create the project
  const project = await createProject(client, {
    name: options.name,
    description: options.description || 'Managed by ProjectFlow',
  });

  // Get userId from auth context
  const { data: { user }, error: userError } = await client.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    throw new Error('User authentication required');
  }

  let gates: Gate[] = [];

  // Configure default gates unless skipped
  if (!options.skipGates) {
    gates = await configureGates(userId, project.id, [
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

  return {
    project,
    gates,
    message: `Project "${project.name}" initialized successfully. ${gates.length} gates configured.`,
  };
}

