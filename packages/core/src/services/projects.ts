/**
 * Project service - handles all project-related business logic
 * 
 * IMPORTANT: This service now uses RLS for security.
 * 
 * All functions accept an authenticated SupabaseClient that has:
 * - Either a session (via auth.uid())
 * - Or an OAuth token (via auth.current_user_id())
 * 
 * The client's auth context is automatically used by RLS policies
 * to filter results to the authenticated user's data only.
 */

import type { Project, ProjectInsert, Database } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { validateProjectData } from '../validation';
import { emitEvent } from '../events';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Creates a new project
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param data Project data to create
 * @param userId Optional user ID (if not provided, will try to get from auth context)
 * @returns The created project
 * @throws NotFoundError if project creation fails
 * 
 * RLS requires user_id to be set explicitly in the insert.
 */
export async function createProject(
  client: SupabaseClient<Database>,
  data: ProjectInsert,
  userId?: string
): Promise<Project> {
  try {
    validateProjectData(data);

    // Get userId from parameter or auth context - required for RLS
    // If userId is provided, use it directly (for OAuth-scoped clients)
    // Otherwise, try to get from auth context (for session-based clients)
    let finalUserId: string | undefined = userId;

    // Validate provided userId if present
    if (finalUserId !== undefined && finalUserId !== null) {
      if (typeof finalUserId !== 'string' || finalUserId.trim() === '') {
        throw new ValidationError('Invalid userId provided: must be a non-empty string');
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
        // We'll throw the validation error below if userId is still missing
      }
    }

    if (!finalUserId) {
      throw new ValidationError('User authentication required');
    }

    // Build insert data with rules if provided
    const insertData: any = {
      user_id: finalUserId, // Explicitly set user_id for RLS policy
      name: data.name,
      description: data.description || null,
    };

    // Add rules if present in data
    if ((data as any).rules !== undefined) {
      insertData.rules = (data as any).rules;
    }

    const { data: project, error } = await (client
      .from('projects')
      .insert([insertData] as any)
      .select()
      .single() as any);

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!project) {
      throw new NotFoundError('Failed to retrieve created project');
    }

    // Emit ProjectCreated event (userId already fetched above)
    if (finalUserId) {
      await emitEvent({
        project_id: project.id,
        user_id: finalUserId,
        event_type: 'ProjectCreated',
        payload: {
          project_id: project.id,
          name: project.name,
          description: project.description,
          rules: (project as any).rules || {},
        },
      });
    }

    return project as Project;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Lists all projects for the authenticated user
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @returns Array of projects owned by the authenticated user
 * 
 * RLS automatically filters to authenticated user's projects.
 */
export async function listProjects(client: SupabaseClient<Database>): Promise<Project[]> {
  try {
    const { data: projects, error } = await client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw mapSupabaseError(error);
    }

    return (projects || []) as Project[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single project by ID
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to fetch
 * @returns The project
 * @throws NotFoundError if project not found or user doesn't own it
 * 
 * RLS ensures the user can only access their own projects.
 */
export async function getProject(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<Project> {
  try {
    // First verify the user is authenticated
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      throw new ValidationError('User authentication required');
    }

    const { data: project, error } = await client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      // Handle specific Supabase errors
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Project not found');
      }
      throw mapSupabaseError(error);
    }

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project as Project;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

