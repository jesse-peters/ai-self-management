import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { getAgentTask, updateAgentTask, updateTaskStatus, addDependency, deleteAgentTask, UnauthorizedError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/agent-tasks/[id]
 * Gets a single agent task with details
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  const params = await context!.params!;
  const id = params.id;

  const task = await getAgentTask(supabase, id);

  return createSuccessResponse({ task }, 200);
}, 'agent-tasks-api');

/**
 * PATCH /api/agent-tasks/[id]
 * Updates an agent task
 * 
 * Body: {
 *   title?: string,
 *   goal?: string,
 *   context?: string,
 *   inputs?: string,
 *   output_expectation?: string,
 *   verification?: string,
 *   type?: 'research' | 'implement' | 'verify' | 'docs' | 'cleanup',
 *   status?: 'ready' | 'doing' | 'blocked' | 'review' | 'done',
 *   blocked_reason?: string,
 *   risk?: 'low' | 'medium' | 'high',
 *   timebox_minutes?: number
 * }
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  const params = await context!.params!;
  const id = params.id;
  const body = await request.json();

  // If only status is being updated, use the specific status update function
  // to enforce invariants (evidence rule, research gating, blocker rule)
  if (body.status && (Object.keys(body).length === 1 || (Object.keys(body).length === 2 && body.blocked_reason))) {
    const task = await updateTaskStatus(supabase, id, body.status, body.blocked_reason);
    return createSuccessResponse({ task }, 200);
  }

  const task = await updateAgentTask(supabase, id, body);

  return createSuccessResponse({ task }, 200);
}, 'agent-tasks-api');

/**
 * DELETE /api/agent-tasks/[id]
 * Deletes an agent task
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  const params = await context!.params!;
  const id = params.id;

  await deleteAgentTask(supabase, id);

  return createSuccessResponse({ success: true }, 200);
}, 'agent-tasks-api');

