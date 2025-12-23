/**
 * Session service - handles agent session and project context operations
 */

import { createServerClient } from '@projectflow/db';
import type { AgentSession } from '@projectflow/db';
import { mapSupabaseError } from '../errors';
import { validateUUID, validateSessionData } from '../validation';
import type { ProjectContext } from '../types';
import { getProject } from './projects';
import { listTasks } from './tasks';

/**
 * Saves or updates a session context for a project
 */
export async function saveSessionContext(
  userId: string,
  projectId: string,
  snapshot: Record<string, unknown>,
  summary?: string
): Promise<AgentSession> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');
    validateSessionData({ snapshot, summary });

    // Verify user owns the project
    await getProject(userId, projectId);

    const supabase = createServerClient();

    const { data: session, error } = await (supabase
      .from('agent_sessions')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
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
 */
export async function getLatestSession(
  userId: string,
  projectId: string
): Promise<AgentSession | null> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Verify user owns the project
    await getProject(userId, projectId);

    const supabase = createServerClient();

    const { data: session, error } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
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
 */
export async function getProjectContext(
  userId: string,
  projectId: string
): Promise<ProjectContext> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(projectId, 'projectId');

    // Load all data in parallel
    const [project, tasks, latestSession] = await Promise.all([
      getProject(userId, projectId),
      listTasks(userId, projectId),
      getLatestSession(userId, projectId),
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

