import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { getAgentTask, updateAgentTask, updateTaskStatus, addDependency } from '@projectflow/core';

/**
 * GET /api/agent-tasks/[id]
 * Gets a single agent task with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const task = await getAgentTask(supabase, id);

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    console.error('Error fetching agent task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agent-tasks/[id]
 * Updates an agent task
 * 
 * Body: {
 *   title?: string,
 *   goal?: string,
 *   context?: string,
 *   inputs?: string,
 *   output_expectation?: string,
 *   verification?: string,
 *   type?: 'research' | 'implement' | 'verify' | 'docs' | 'cleanup',
 *   status?: 'ready' | 'doing' | 'blocked' | 'review' | 'done',
 *   blocked_reason?: string,
 *   risk?: 'low' | 'medium' | 'high',
 *   timebox_minutes?: number
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // If only status is being updated, use the specific status update function
    // to enforce invariants (evidence rule, research gating, blocker rule)
    if (body.status && (Object.keys(body).length === 1 || (Object.keys(body).length === 2 && body.blocked_reason))) {
      const task = await updateTaskStatus(supabase, id, body.status, body.blocked_reason);
      return NextResponse.json({ task }, { status: 200 });
    }

    const task = await updateAgentTask(supabase, id, body);

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    console.error('Error updating agent task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

