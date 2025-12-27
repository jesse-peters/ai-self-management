import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { getTaskEvents, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/events/task/[taskId]?limit={limit}
 * Get events for a specific task
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

  const params = await context?.params;
  const taskId = params?.taskId;
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');

  if (!taskId) {
    throw new ValidationError('taskId is required');
  }

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  if (limit !== undefined && (isNaN(limit) || limit < 1)) {
    throw new ValidationError('limit must be a positive number');
  }

  const events = await getTaskEvents(taskId, limit);

  return createSuccessResponse({ events }, 200);
}, 'task-events-api');

