/**
 * Project Specs service - handles project specification management
 * 
 * IMPORTANT: This service uses RLS for security.
 * All functions accept an authenticated SupabaseClient.
 */

import type { Database, ProjectSpec } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { getProject } from './projects';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Gets project spec for a project
 * 
 * @param client Authenticated Supabase client
 * @param projectId Project ID
 * @returns Project spec
 */
export async function getProjectSpec(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<ProjectSpec> {
  try {
    // Verify user owns the project
    await getProject(client, projectId);

    const { data: spec, error } = await client
      .from('project_specs')
      .select('*')
      .eq('project_id', projectId)
      .single();
    
    if (error) {
      throw mapSupabaseError(error);
    }
    
    if (!spec) {
      throw new NotFoundError('Project spec not found');
    }
    
    return spec as ProjectSpec;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Updates project spec plan path and metadata
 * 
 * @param client Authenticated Supabase client
 * @param projectId Project ID
 * @param planPath Plan file path
 * @param planHash Optional plan hash
 * @param lastImportedAt Optional last imported timestamp
 * @param lastExportedAt Optional last exported timestamp
 */
export async function updateProjectSpecPlanMetadata(
  client: SupabaseClient<Database>,
  projectId: string,
  planPath?: string,
  planHash?: string,
  lastImportedAt?: string,
  lastExportedAt?: string
): Promise<void> {
  try {
    // Verify user owns the project
    await getProject(client, projectId);

    const updateData: any = {};
    if (planPath !== undefined) {
      updateData.plan_path = planPath;
    }
    if (planHash !== undefined) {
      updateData.plan_hash = planHash;
    }
    if (lastImportedAt !== undefined) {
      updateData.last_imported_at = lastImportedAt;
    }
    if (lastExportedAt !== undefined) {
      updateData.last_exported_at = lastExportedAt;
    }

    if (Object.keys(updateData).length === 0) {
      return; // Nothing to update
    }

    const { error } = await client
      .from('project_specs')
      .update(updateData)
      .eq('project_id', projectId);
    
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

/**
 * Updates project spec plan path
 * 
 * @param client Authenticated Supabase client
 * @param projectId Project ID
 * @param planPath Plan file path
 */
export async function updateProjectSpecPlanPath(
  client: SupabaseClient<Database>,
  projectId: string,
  planPath: string
): Promise<void> {
  await updateProjectSpecPlanMetadata(client, projectId, planPath);
}


