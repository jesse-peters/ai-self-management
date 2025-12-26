import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { recall } from '@projectflow/core';

/**
 * GET /api/memory/recall
 * 
 * Recalls relevant history (decisions, outcomes, constraints) for a project
 * 
 * Query params:
 * - projectId: string (required)
 * - query: string (optional) - free text search query
 * - tags: string (optional) - JSON array of tags
 * - files: string (optional) - JSON array of file paths
 * - keywords: string (optional) - JSON array of keywords
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get user from session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Parse optional parameters
    const query = searchParams.get('query') || undefined;
    const tags = searchParams.get('tags') ? JSON.parse(searchParams.get('tags')!) : undefined;
    const files = searchParams.get('files') ? JSON.parse(searchParams.get('files')!) : undefined;
    const keywords = searchParams.get('keywords') ? JSON.parse(searchParams.get('keywords')!) : undefined;

    // Call memory recall service
    const result = await recall(userId, projectId, {
      query,
      tags,
      files,
      keywords,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error recalling memory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to recall memory' },
      { status: 500 }
    );
  }
}

