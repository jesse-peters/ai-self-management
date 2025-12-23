/**
 * Session service - handles agent session and project context operations
 * 
 * IMPORTANT: This service now uses RLS for security.
 * All functions accept an authenticated SupabaseClient.
 */

import type { AgentSession, Database } from '@projectflow/db';
import { mapSupabaseError } from '../errors';
import { validateSessionData } from '../validation';
import type { ProjectContext } from '../types';
import { getProject } from './projects';
import { listTasks } from './tasks';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Saves or updates a session context for a project
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to save session for
 * @param snapshot Session snapshot data
 * @param summary Optional session summary
 * @returns The saved session
 * 
 * RLS automatically sets user_id from authenticated context.
 */
export async function saveSessionContext(
  client: SupabaseClient<Database>,
  projectId: string,
  snapshot: Record<string, unknown>,
  summary?: string
): Promise<AgentSession> {
  try {
    validateSessionData({ snapshot, summary });

    // Verify user owns the project
    await getProject(client, projectId);

    const { data: session, error } = await (client
      .from('agent_sessions')
      .insert([
        {
          project_id: projectId,
          snapshot,
          summary: summary || null,
        },
      ] as any)
      .select()
      .single() as any);

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!session) {
      throw new Error('Failed to retrieve created session');
    }

    return session as AgentSession;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets the latest session for a project
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to get session for
 * @returns The latest session or null if none exists
 */
export async function getLatestSession(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<AgentSession | null> {
  try {
    // Verify user owns the project
    await getProject(client, projectId);

    const { data: session, error } = await client
      .from('agent_sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows found" which is expected when there's no session
      throw mapSupabaseError(error);
    }

    return (session || null) as AgentSession | null;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets complete project context including project, tasks, and latest session
 * 
 * @param client Authenticated Supabase client (session or OAuth)
 * @param projectId Project ID to get context for
 * @returns Complete project context
 */
export async function getProjectContext(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<ProjectContext> {
  try {
    // Load all data in parallel
    const [project, tasks, latestSession] = await Promise.all([
      getProject(client, projectId),
      listTasks(client, projectId),
      getLatestSession(client, projectId),
    ]);

    return {
      project,
      tasks,
      latestSession,
    };
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

