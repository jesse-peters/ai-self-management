import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { configureGates, listGates, getGateStatus } from '@projectflow/core/server';
import type { GateConfigInput } from '@projectflow/core';
import { UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/gates?projectId={id}&workItemId={id}
 * Lists gates for a project or gets gate status
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
  const includeStatus = searchParams.get('includeStatus') === 'true';

  if (!projectId) {
    throw new ValidationError('projectId is required');
  }

  // If includeStatus is true, return gate status summary
  if (includeStatus) {
    const gateStatus = await getGateStatus(user.id, projectId, workItemId || undefined, supabase);
    return createSuccessResponse({ gateStatus }, 200);
  }

  // Otherwise, just return the list of gates
  const gates = await listGates(user.id, projectId, supabase);

  return createSuccessResponse({ gates }, 200);
}, 'gates-api');

/**
 * POST /api/gates
 * Configures gates for a project (upserts)
 * 
 * Body: {
 *   projectId: string,
 *   gates: Array<{
 *     name: string,
 *     is_required: boolean,
 *     runner_mode: 'manual' | 'command',
 *     command?: string
 *   }>
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
  const { projectId, gates } = body;

  if (!projectId) {
    throw new ValidationError('projectId is required', 'projectId');
  }

  if (!gates || !Array.isArray(gates) || gates.length === 0) {
    throw new ValidationError('gates array is required', 'gates');
  }

  const configuredGates = await configureGates(user.id, projectId, gates, supabase);

  return createSuccessResponse({ gates: configuredGates }, 200);
}, 'gates-api');

