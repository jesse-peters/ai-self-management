import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createAgentTask, listAgentTasks } from '@projectflow/core';

/**
 * GET /api/agent-tasks?projectId={id}&workItemId={id}&status={status}&type={type}
 * Lists agent tasks with optional filters
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
    const status = searchParams.get('status') as 'ready' | 'doing' | 'blocked' | 'review' | 'done' | null;
    const type = searchParams.get('type') as 'research' | 'implement' | 'verify' | 'docs' | 'cleanup' | null;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const filters: any = {};
    if (workItemId) filters.workItemId = workItemId;
    if (status) filters.status = status;
    if (type) filters.type = type;

    const tasks = await listAgentTasks(supabase, projectId, filters);

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error('Error fetching agent tasks:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-tasks
 * Creates a new agent task
 * 
 * Body: {
 *   projectId: string,
 *   workItemId?: string,
 *   type: 'research' | 'implement' | 'verify' | 'docs' | 'cleanup',
 *   title: string,
 *   goal: string,
 *   context?: string,
 *   inputs?: string,
 *   output_expectation?: string,
 *   verification?: string,
 *   status?: 'ready' | 'doing' | 'blocked' | 'review' | 'done',
 *   depends_on_ids?: string[],
 *   risk?: 'low' | 'medium' | 'high',
 *   timebox_minutes?: number
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
    const {
      projectId,
      workItemId,
      type,
      title,
      goal,
      context,
      inputs,
      output_expectation,
      verification,
      status,
      depends_on_ids,
      risk,
      timebox_minutes,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!goal || goal.trim().length === 0) {
      return NextResponse.json({ error: 'goal is required' }, { status: 400 });
    }

    const task = await createAgentTask(supabase, projectId, {
      work_item_id: workItemId || null,
      type,
      title: title.trim(),
      goal: goal.trim(),
      context: context || null,
      inputs: inputs || null,
      output_expectation: output_expectation || null,
      verification: verification || null,
      status: status || 'ready',
      depends_on_ids: depends_on_ids || [],
      risk: risk || 'low',
      timebox_minutes: timebox_minutes || 15,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

