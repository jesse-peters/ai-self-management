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
  userId: string
): Promise<Project> {
  try {
    validateProjectData(data);

    // Log what we received for debugging
    console.log('[createProject] Received parameters', {
      userIdProvided: userId,
      userIdType: typeof userId,
      userIdLength: userId ? userId.length : 0,
      userIdValue: userId ? `${userId.substring(0, 8)}...` : 'undefined',
      projectName: data.name,
      stackTrace: new Error().stack?.split('\n').slice(0, 5).join('\n'),
    });

    // userId is now required (not optional) - this should never be undefined
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('[createProject] CRITICAL: userId parameter is missing or invalid', {
        userId,
        userIdType: typeof userId,
        callStack: new Error().stack,
      });
      throw new ValidationError(`User authentication required: userId parameter is ${userId === undefined ? 'undefined' : userId === null ? 'null' : 'empty/invalid'} in createProject`);
    }

    // Get userId from parameter - required for RLS
    // userId is now required (not optional), so we always use it directly
    const finalUserId: string = userId.trim();

    console.log('[createProject] Using provided userId', {
      userId: finalUserId,
      userIdLength: finalUserId.length,
    });

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

    console.log('[createProject] Attempting database insert', {
      userId: finalUserId,
      projectName: data.name,
      insertDataKeys: Object.keys(insertData),
    });

    const { data: project, error } = await (client
      .from('projects')
      .insert([insertData] as any)
      .select()
      .single() as any);

    if (error) {
      console.error('[createProject] Database insert failed', {
        error: error.message || error.msg || String(error),
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        userId: finalUserId,
        projectName: data.name,
      });
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
 * @param userId Optional user ID (if not provided, will try to get from auth context)
 * @returns The project
 * @throws NotFoundError if project not found or user doesn't own it
 * 
 * RLS ensures the user can only access their own projects.
 */
export async function getProject(
  client: SupabaseClient<Database>,
  projectId: string,
  userId?: string
): Promise<Project> {
  try {
    // Only verify user authentication if userId not provided
    // For OAuth-scoped clients, userId is already validated in authenticateTool
    // For session-based clients, we can get it from auth context
    if (!userId) {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) {
        throw new ValidationError('User authentication required');
      }
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

/**
 * Deletes a project
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to delete
 * @param userId Optional user ID (if not provided, will try to get from auth context)
 * @throws NotFoundError if project not found or user doesn't own it
 * 
 * RLS ensures the user can only delete their own projects.
 * Cascading deletes will remove all related tasks, work items, and agent tasks.
 */
export async function deleteProject(
  client: SupabaseClient<Database>,
  projectId: string,
  userId?: string
): Promise<void> {
  try {
    // Verify project ownership via getProject
    const project = await getProject(client, projectId, userId);

    // Get userId for event emission
    let finalUserId: string | undefined = userId;
    if (!finalUserId) {
      try {
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (!userError && user?.id) {
          finalUserId = user.id;
        }
      } catch (authError) {
        // If getUser() fails, we'll use the project's user_id
        finalUserId = (project as any).user_id;
      }
    }

    if (!finalUserId) {
      finalUserId = (project as any).user_id;
    }

    // Emit ProjectDeleted event BEFORE deletion (to satisfy FK constraint)
    if (finalUserId) {
      await emitEvent({
        project_id: projectId,
        user_id: finalUserId,
        event_type: 'ProjectDeleted',
        payload: {
          project_id: projectId,
          name: project.name,
        },
      });
    }

    // Delete project (cascades to related entities via FK constraints)
    // Note: The event will be cascade-deleted, which is acceptable for deletion events
    const { error } = await client
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      throw mapSupabaseError(error);
    }
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

