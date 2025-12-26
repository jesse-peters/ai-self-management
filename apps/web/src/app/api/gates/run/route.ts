import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { runGate } from '@projectflow/core/server';

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
    const { projectId, gateName, taskId, workItemId, cwd } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!gateName || gateName.trim().length === 0) {
      return NextResponse.json({ error: 'gateName is required' }, { status: 400 });
    }

    const gateRun = await runGate(user.id, projectId, gateName.trim(), {
      task_id: taskId || undefined,
      work_item_id: workItemId || undefined,
      cwd: cwd || undefined,
    }, supabase);

    return NextResponse.json({ gateRun }, { status: 200 });
  } catch (error) {
    console.error('Error running gate:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

