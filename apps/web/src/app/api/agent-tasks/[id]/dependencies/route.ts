import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { addDependency } from '@projectflow/core';

/**
 * POST /api/agent-tasks/[id]/dependencies
 * Adds a dependency to a task
 * 
 * Body: {
 *   dependsOnTaskId: string
 * }
 */
export async function POST(
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
    const { dependsOnTaskId } = body;

    if (!dependsOnTaskId) {
      return NextResponse.json({ error: 'dependsOnTaskId is required' }, { status: 400 });
    }

    const task = await addDependency(supabase, id, dependsOnTaskId);

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    console.error('Error adding dependency:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

