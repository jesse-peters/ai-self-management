import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { configureGates, listGates, getGateStatus } from '@projectflow/core/server';
import type { GateConfigInput } from '@projectflow/core';

/**
 * GET /api/gates?projectId={id}&workItemId={id}
 * Lists gates for a project or gets gate status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const workItemId = searchParams.get('workItemId');
    const includeStatus = searchParams.get('includeStatus') === 'true';

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // If includeStatus is true, return gate status summary
    if (includeStatus) {
      const gateStatus = await getGateStatus(user.id, projectId, workItemId || undefined, supabase);
      return NextResponse.json({ gateStatus }, { status: 200 });
    }

    // Otherwise, just return the list of gates
    const gates = await listGates(user.id, projectId, supabase);

    return NextResponse.json({ gates }, { status: 200 });
  } catch (error) {
    console.error('Error fetching gates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

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
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, gates } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!gates || !Array.isArray(gates) || gates.length === 0) {
      return NextResponse.json({ error: 'gates array is required' }, { status: 400 });
    }

    const configuredGates = await configureGates(user.id, projectId, gates, supabase);

    return NextResponse.json({ gates: configuredGates }, { status: 200 });
  } catch (error) {
    console.error('Error configuring gates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

