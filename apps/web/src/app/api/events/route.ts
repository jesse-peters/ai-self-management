import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { getProjectEvents } from '@projectflow/core';

/**
 * GET /api/events?projectId={id}&limit={limit}
 * Get events for a project
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
    const limitParam = searchParams.get('limit');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    if (limit !== undefined && (isNaN(limit) || limit < 1)) {
      return NextResponse.json({ error: 'limit must be a positive number' }, { status: 400 });
    }

    const events = await getProjectEvents(projectId, limit);

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

