import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { runGate } from '@projectflow/core/server';
import { UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * POST /api/gates/run
 * Executes a gate and stores the result
 * 
 * Body: {
 *   projectId: string,
 *   gateName: string,
 *   taskId?: string,
 *   workItemId?: string,
 *   cwd?: string
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
  const { projectId, gateName, taskId, workItemId, cwd } = body;

  if (!projectId) {
    throw new ValidationError('projectId is required', 'projectId');
  }

  if (!gateName || gateName.trim().length === 0) {
    throw new ValidationError('gateName is required', 'gateName');
  }

  const gateRun = await runGate(user.id, projectId, gateName.trim(), {
    task_id: taskId || undefined,
    work_item_id: workItemId || undefined,
    cwd: cwd || undefined,
  }, supabase);

  return createSuccessResponse({ gateRun }, 200);
}, 'gates-api');

