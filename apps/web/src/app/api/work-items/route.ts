import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { createWorkItem, listWorkItems } from '@projectflow/core';

/**
 * GET /api/work-items?projectId={id}&status={status}
 * Lists work items for a project with optional status filter
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
    const status = searchParams.get('status') as 'open' | 'in_progress' | 'done' | null;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const workItems = await listWorkItems(supabase, projectId, status || undefined);

    return NextResponse.json({ workItems }, { status: 200 });
  } catch (error) {
    console.error('Error fetching work items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/work-items
 * Creates a new work item
 * 
 * Body: {
 *   projectId: string,
 *   title: string,
 *   description?: string,
 *   external_url?: string,
 *   status?: 'open' | 'in_progress' | 'done'
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
    const { projectId, title, description, external_url, status } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const workItem = await createWorkItem(supabase, projectId, {
      title: title.trim(),
      description: description || null,
      external_url: external_url || null,
      status: status || 'open',
    });

    return NextResponse.json({ workItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating work item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

