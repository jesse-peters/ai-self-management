import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { addDependency, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * POST /api/agent-tasks/[id]/dependencies
 * Adds a dependency to a task
 * 
 * Body: {
 *   dependsOnTaskId: string
 * }
 */
export const POST = withErrorHandler(async (
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
  const { dependsOnTaskId } = body;

  if (!dependsOnTaskId) {
    throw new ValidationError('dependsOnTaskId is required', 'dependsOnTaskId');
  }

  const task = await addDependency(supabase, id, dependsOnTaskId);

  return createSuccessResponse({ task }, 200);
}, 'agent-tasks-api');

