/**
 * Project service - handles all project-related business logic
 */

import { createServerClient } from '@projectflow/db';
import type { Project, ProjectInsert } from '@projectflow/db';
import { NotFoundError, mapSupabaseError } from '../errors';
import { validateUUID, validateProjectData } from '../validation';

/**
 * Creates a new project for the given user
 */
export async function createProject(userId: string, data: ProjectInsert): Promise<Project> {
  try {
    validateUUID(userId, 'userId');
    validateProjectData(data);

    const supabase = createServerClient();

    const { data: project, error } = await (supabase
      .from('projects')
      .insert([
        {
          user_id: userId,
          name: data.name,
          description: data.description || null,
        },
      ] as any)
      .select()
      .single() as any);

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!project) {
      throw new NotFoundError('Failed to retrieve created project');
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
 * Lists all projects for the given user
 */
export async function listProjects(userId: string): Promise<Project[]> {
  try {
    validateUUID(userId, 'userId');

    const supabase = createServerClient();

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
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
 * Gets a single project by ID, verifying the user owns it
 */
export async function getProject(userId: string, projectId: string): Promise<Project> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    const supabase = createServerClient();

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error) {
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

