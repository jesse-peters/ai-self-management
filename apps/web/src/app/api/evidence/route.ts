import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { addEvidence, listEvidence, deleteEvidence, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/evidence?projectId={id}&taskId={id}&workItemId={id}
 * Lists evidence with optional filters
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
  const taskId = searchParams.get('taskId');
  const workItemId = searchParams.get('workItemId');
  const type = searchParams.get('type') as 'note' | 'link' | 'log' | 'diff' | null;
  const createdBy = searchParams.get('createdBy') as 'agent' | 'human' | null;
  const limitStr = searchParams.get('limit');

  if (!projectId) {
    throw new ValidationError('projectId is required');
  }

  const filters: any = {};
  if (taskId) filters.task_id = taskId;
  if (workItemId) filters.work_item_id = workItemId;
  if (type) filters.type = type;
  if (createdBy) filters.created_by = createdBy;
  if (limitStr) filters.limit = parseInt(limitStr, 10);

  const evidence = await listEvidence(user.id, projectId, filters);

  return createSuccessResponse({ evidence }, 200);
}, 'evidence-api');

/**
 * POST /api/evidence
 * Creates a new evidence item
 * 
 * Body: {
 *   projectId: string,
 *   taskId?: string,
 *   workItemId?: string,
 *   type: 'note' | 'link' | 'log' | 'diff',
 *   content: string,
 *   created_by: 'agent' | 'human'
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
  const { projectId, taskId, workItemId, type, content, created_by } = body;

  if (!projectId) {
    throw new ValidationError('projectId is required', 'projectId');
  }

  if (!taskId && !workItemId) {
    throw new ValidationError('Either taskId or workItemId is required');
  }

  if (!type) {
    throw new ValidationError('type is required', 'type');
  }

  if (!content || content.trim().length === 0) {
    throw new ValidationError('content is required', 'content');
  }

  if (!created_by) {
    throw new ValidationError('created_by is required', 'created_by');
  }

  const evidence = await addEvidence(user.id, projectId, {
    task_id: taskId || undefined,
    work_item_id: workItemId || undefined,
    type,
    content: content.trim(),
    created_by,
  });

  return createSuccessResponse({ evidence }, 201);
}, 'evidence-api');

/**
 * DELETE /api/evidence?id={id}
 * Deletes evidence
 */
export const DELETE = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('id is required');
  }

  await deleteEvidence(user.id, id);

  return createSuccessResponse({ success: true }, 200);
}, 'evidence-api');

