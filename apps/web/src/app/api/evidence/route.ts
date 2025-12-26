import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { addEvidence, listEvidence } from '@projectflow/core';

/**
 * GET /api/evidence?projectId={id}&taskId={id}&workItemId={id}
 * Lists evidence with optional filters
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
    const taskId = searchParams.get('taskId');
    const workItemId = searchParams.get('workItemId');
    const type = searchParams.get('type') as 'note' | 'link' | 'log' | 'diff' | null;
    const createdBy = searchParams.get('createdBy') as 'agent' | 'human' | null;
    const limitStr = searchParams.get('limit');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const filters: any = {};
    if (taskId) filters.task_id = taskId;
    if (workItemId) filters.work_item_id = workItemId;
    if (type) filters.type = type;
    if (createdBy) filters.created_by = createdBy;
    if (limitStr) filters.limit = parseInt(limitStr, 10);

    const evidence = await listEvidence(user.id, projectId, filters);

    return NextResponse.json({ evidence }, { status: 200 });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evidence
 * Creates a new evidence item
 * 
 * Body: {
 *   projectId: string,
 *   taskId?: string,
 *   workItemId?: string,
 *   type: 'note' | 'link' | 'log' | 'diff',
 *   content: string,
 *   created_by: 'agent' | 'human'
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
    const { projectId, taskId, workItemId, type, content, created_by } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!taskId && !workItemId) {
      return NextResponse.json(
        { error: 'Either taskId or workItemId is required' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    if (!created_by) {
      return NextResponse.json({ error: 'created_by is required' }, { status: 400 });
    }

    const evidence = await addEvidence(user.id, projectId, {
      task_id: taskId || undefined,
      work_item_id: workItemId || undefined,
      type,
      content: content.trim(),
      created_by,
    });

    return NextResponse.json({ evidence }, { status: 201 });
  } catch (error) {
    console.error('Error creating evidence:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

