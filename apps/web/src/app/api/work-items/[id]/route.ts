import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { getWorkItem, updateWorkItem, updateWorkItemStatus, deleteWorkItem, UnauthorizedError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/work-items/[id]
 * Gets a single work item with summary data
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

  const workItem = await getWorkItem(supabase, id);

  return createSuccessResponse({ workItem }, 200);
}, 'work-items-api');

/**
 * PATCH /api/work-items/[id]
 * Updates a work item
 * 
 * Body: {
 *   title?: string,
 *   description?: string,
 *   external_url?: string,
 *   status?: 'open' | 'in_progress' | 'done'
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
  // to enforce gate rules
  if (body.status && Object.keys(body).length === 1) {
    const workItem = await updateWorkItemStatus(supabase, id, body.status);
    return createSuccessResponse({ workItem }, 200);
  }

  const workItem = await updateWorkItem(supabase, id, body);

  return createSuccessResponse({ workItem }, 200);
}, 'work-items-api');

/**
 * DELETE /api/work-items/[id]
 * Deletes a work item
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

  await deleteWorkItem(supabase, id);

  return createSuccessResponse({ success: true }, 200);
}, 'work-items-api');

