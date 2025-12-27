import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { listDecisions, deleteDecision, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/decisions?projectId={id}&limit={limit}
 * Get decisions for a project
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
  const limitParam = searchParams.get('limit');

  if (!projectId) {
    throw new ValidationError('projectId is required');
  }

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  if (limit !== undefined && (isNaN(limit) || limit < 1)) {
    throw new ValidationError('limit must be a positive number');
  }

  const decisions = await listDecisions(user.id, projectId, limit);

  return createSuccessResponse({ decisions }, 200);
}, 'decisions-api');

/**
 * DELETE /api/decisions?id={id}
 * Deletes a decision
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

  await deleteDecision(user.id, id);

  return createSuccessResponse({ success: true }, 200);
}, 'decisions-api');

