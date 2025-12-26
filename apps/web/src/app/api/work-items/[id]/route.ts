import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { getWorkItem, updateWorkItem, updateWorkItemStatus } from '@projectflow/core';

/**
 * GET /api/work-items/[id]
 * Gets a single work item with summary data
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

    const workItem = await getWorkItem(supabase, id);

    return NextResponse.json({ workItem }, { status: 200 });
  } catch (error) {
    console.error('Error fetching work item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/work-items/[id]
 * Updates a work item
 * 
 * Body: {
 *   title?: string,
 *   description?: string,
 *   external_url?: string,
 *   status?: 'open' | 'in_progress' | 'done'
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
    // to enforce gate rules
    if (body.status && Object.keys(body).length === 1) {
      const workItem = await updateWorkItemStatus(supabase, id, body.status);
      return NextResponse.json({ workItem }, { status: 200 });
    }

    const workItem = await updateWorkItem(supabase, id, body);

    return NextResponse.json({ workItem }, { status: 200 });
  } catch (error) {
    console.error('Error updating work item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

