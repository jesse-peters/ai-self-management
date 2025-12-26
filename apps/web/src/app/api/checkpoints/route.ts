import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { listCheckpoints, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/checkpoints?projectId={id}&limit={limit}
 * Get checkpoints for a project
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

  const checkpoints = await listCheckpoints(user.id, projectId, limit);

  return createSuccessResponse({ checkpoints }, 200);
}, 'checkpoints-api');

