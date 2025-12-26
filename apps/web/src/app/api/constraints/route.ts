import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { listConstraints, createConstraint } from '@projectflow/core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/constraints
 * Lists constraints for a project
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project ID from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
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

    return NextResponse.json({ constraints });
  } catch (error) {
    console.error('Error listing constraints:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/constraints
 * Creates a new constraint for a project
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Missing required fields: projectId, scope, trigger, ruleText, enforcementLevel' },
        { status: 400 }
      );
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

    return NextResponse.json({ constraint }, { status: 201 });
  } catch (error) {
    console.error('Error creating constraint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

