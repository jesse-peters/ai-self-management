import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createAgentTask, listAgentTasks, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/agent-tasks?projectId={id}&workItemId={id}&status={status}&type={type}
 * Lists agent tasks with optional filters
 */
export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const workItemId = searchParams.get('workItemId');
  const status = searchParams.get('status') as 'ready' | 'doing' | 'blocked' | 'review' | 'done' | null;
  const type = searchParams.get('type') as 'research' | 'implement' | 'verify' | 'docs' | 'cleanup' | null;

  if (!projectId) {
    throw new ValidationError('projectId is required');
  }

  const filters: any = {};
  if (workItemId) filters.workItemId = workItemId;
  if (status) filters.status = status;
  if (type) filters.type = type;

  const tasks = await listAgentTasks(supabase, projectId, filters);

  return createSuccessResponse({ tasks }, 200);
}, 'agent-tasks-api');

/**
 * POST /api/agent-tasks
 * Creates a new agent task
 * 
 * Body: {
 *   projectId: string,
 *   workItemId?: string,
 *   type: 'research' | 'implement' | 'verify' | 'docs' | 'cleanup',
 *   title: string,
 *   goal: string,
 *   context?: string,
 *   inputs?: string,
 *   output_expectation?: string,
 *   verification?: string,
 *   status?: 'ready' | 'doing' | 'blocked' | 'review' | 'done',
 *   depends_on_ids?: string[],
 *   risk?: 'low' | 'medium' | 'high',
 *   timebox_minutes?: number
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  const body = await request.json();
  const {
    projectId,
    workItemId,
    type,
    title,
    goal,
    context,
    inputs,
    output_expectation,
    verification,
    status,
    depends_on_ids,
    risk,
    timebox_minutes,
  } = body;

  if (!projectId) {
    throw new ValidationError('projectId is required', 'projectId');
  }

  if (!type) {
    throw new ValidationError('type is required', 'type');
  }

  if (!title || title.trim().length === 0) {
    throw new ValidationError('title is required', 'title');
  }

  if (!goal || goal.trim().length === 0) {
    throw new ValidationError('goal is required', 'goal');
  }

  const task = await createAgentTask(supabase, projectId, {
    work_item_id: workItemId || null,
    type,
    title: title.trim(),
    goal: goal.trim(),
    context: context || null,
    inputs: inputs || null,
    output_expectation: output_expectation || null,
    verification: verification || null,
    status: status || 'ready',
    depends_on_ids: depends_on_ids || [],
    risk: risk || 'low',
    timebox_minutes: timebox_minutes || 15,
    task_key: null,
    expected_files: [],
    touched_files: [],
    subtasks: null,
    gates: null,
  });

  return createSuccessResponse({ task }, 201);
}, 'agent-tasks-api');

