/**
 * SERVER-ONLY INITIALIZATION SERVICE
 * 
 * This module should only be imported on the server side.
 * For browser-safe initialization, use ./init.ts
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
 * Result of initialization with manifest and primer creation
 */
export interface InitProjectWithManifestsResult {
    project: Project;
    gates: Gate[];
    message: string;
    manifestPaths?: {
        projectManifest: string;
        localManifest: string;
        pmDir: string;
    };
    primerPath?: string; // Path to generated .pm/primer.md
    conventions?: ProjectConventions;
    reconProfile?: ReconProfile;
}

/**
 * Initialization options for manifest/primer support
 */
export interface InitProjectWithManifestsOptions {
    name: string;
    description?: string;
    skipGates?: boolean;
    repoRoot: string; // Required: path to repository root for manifest creation
    interviewResponses?: Record<string, unknown>; // Pre-filled interview responses
}

/**
 * Initializes a new project with manifests and primer generation
 * 
 * This function requires file I/O and should only be imported from '@projectflow/core/server'
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param options Initialization options
 * @returns Project, gates, and manifest paths
 */
export async function initProjectWithManifests(
    client: SupabaseClient<Database>,
    options: InitProjectWithManifestsOptions,
    userId?: string
): Promise<InitProjectWithManifestsResult> {
    // Import file-system dependent functions (avoid at top-level)
    const { initializeManifests } = await import('./manifest');
    const { generatePrimer } = await import('./primer');

    // Get userId from parameter or auth context
    // If userId is provided, use it directly (for OAuth-scoped clients)
    // Otherwise, try to get from auth context (for session-based clients)
    let finalUserId: string | undefined = userId;

    // Validate provided userId if present
    if (finalUserId !== undefined && finalUserId !== null) {
        if (typeof finalUserId !== 'string' || finalUserId.trim() === '') {
            throw new Error('Invalid userId provided: must be a non-empty string');
        }
        finalUserId = finalUserId.trim();
    }

    // Only try to get from auth context if userId wasn't provided
    // Skip this for OAuth-scoped clients where getUser() may not work
    if (!finalUserId) {
        try {
            const { data: { user }, error: userError } = await client.auth.getUser();
            if (!userError && user?.id) {
                finalUserId = user.id;
            }
        } catch (authError) {
            // If getUser() fails (e.g., on OAuth-scoped clients), that's okay
            // We'll throw the error below if userId is still missing
        }
    }

    if (!finalUserId) {
        throw new Error('User authentication required');
    }

    // Create the project with userId
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

    // Initialize manifests
    const manifestPaths = initializeManifests(options.repoRoot, project, finalUserId);

    let result: InitProjectWithManifestsResult = {
        project,
        gates,
        message: `Project "${project.name}" initialized successfully. ${gates.length} gates configured. Manifests created in .pm directory.`,
        manifestPaths,
    };

    // Handle interview mode to capture conventions
    if (options.interviewResponses) {
        try {
            const conventions = processInterviewResponses(options.interviewResponses);
            const reconProfile = generateReconProfile(conventions);

            // Save conventions to project
            try {
                await saveProjectConventions(client, project.id, conventions);
                result.conventions = conventions;
                result.reconProfile = reconProfile;
                result.message += ' Project conventions captured from interview.';
            } catch (conventionsError) {
                // Log the error but don't fail the entire init
                console.error('Failed to save project conventions:', conventionsError);
                // Still include conventions in result so they can be saved later
                result.conventions = conventions;
                result.reconProfile = reconProfile;
                result.message += ` Project created, but conventions could not be saved: ${conventionsError instanceof Error ? conventionsError.message : 'Unknown error'}. You can update conventions later.`;
            }

            // Generate primer
            try {
                const primerResult = generatePrimer(manifestPaths.pmDir, conventions);
                result.primerPath = primerResult.path;
                result.message += ` Primer generated at ${primerResult.path}.`;
            } catch (primerError) {
                console.error('Failed to generate primer:', primerError);
                // Don't block the init process if primer generation fails
            }
        } catch (error) {
            // If interview processing fails, log but don't block the init process
            console.error('Failed to process interview responses:', error);
            result.message += ` Warning: Interview processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }

    return result;
}

