import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { listArtifacts } from '@projectflow/core';

/**
 * GET /api/artifacts?taskId={id}
 * Get artifacts for a task
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
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const artifacts = await listArtifacts(user.id, taskId);

    return NextResponse.json({ artifacts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

