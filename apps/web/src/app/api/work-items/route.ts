import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createWorkItem, listWorkItems, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/work-items?projectId={id}&status={status}
 * Lists work items for a project with optional status filter
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
  const status = searchParams.get('status') as 'open' | 'in_progress' | 'done' | null;

  if (!projectId) {
    throw new ValidationError('projectId is required');
  }

  const workItems = await listWorkItems(supabase, projectId, status || undefined);

  return createSuccessResponse({ workItems }, 200);
}, 'work-items-api');

/**
 * POST /api/work-items
 * Creates a new work item
 * 
 * Body: {
 *   projectId: string,
 *   title: string,
 *   description?: string,
 *   external_url?: string,
 *   status?: 'open' | 'in_progress' | 'done'
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
  const { projectId, title, description, external_url, status } = body;

  if (!projectId) {
    throw new ValidationError('projectId is required', 'projectId');
  }

  if (!title || title.trim().length === 0) {
    throw new ValidationError('title is required', 'title');
  }

  const workItem = await createWorkItem(supabase, projectId, {
    title: title.trim(),
    description: description || null,
    external_url: external_url || null,
    status: status || 'open',
    definition_of_done: null,
  });

  return createSuccessResponse({ workItem }, 201);
}, 'work-items-api');

