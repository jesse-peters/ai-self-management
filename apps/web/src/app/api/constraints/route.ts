import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { listConstraints, createConstraint, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

export const dynamic = 'force-dynamic';

/**
 * GET /api/constraints
 * Lists constraints for a project
 */
export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  const supabase = await createServerClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Get project ID from query params
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    throw new ValidationError('Project ID is required');
  }

  // Get optional filters
  const scope = searchParams.get('scope') as any;
  const trigger = searchParams.get('trigger') as any;
  const enforcementLevel = searchParams.get('enforcementLevel') as any;

  const filters: any = {};
  if (scope) filters.scope = scope;
  if (trigger) filters.trigger = trigger;
  if (enforcementLevel) filters.enforcementLevel = enforcementLevel;

  const constraints = await listConstraints(user.id, projectId, filters);

  return createSuccessResponse({ constraints });
}, 'constraints-api');

/**
 * POST /api/constraints
 * Creates a new constraint for a project
 */
export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  const supabase = await createServerClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Parse request body
  const body = await request.json();
  const {
    projectId,
    scope,
    scopeValue,
    trigger,
    triggerValue,
    ruleText,
    enforcementLevel,
    sourceLinks,
  } = body;

  // Validate required fields
  if (!projectId || !scope || !trigger || !ruleText || !enforcementLevel) {
    throw new ValidationError('Missing required fields: projectId, scope, trigger, ruleText, enforcementLevel');
  }

  const constraint = await createConstraint(user.id, projectId, {
    scope,
    scopeValue,
    trigger,
    triggerValue,
    ruleText,
    enforcementLevel,
    sourceLinks,
  });

  return createSuccessResponse({ constraint }, 201);
}, 'constraints-api');

