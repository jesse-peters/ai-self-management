import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { recall, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

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
export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
  const supabase = await createServerClient();

  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new UnauthorizedError('Authentication required');
  }

  const userId = user.id;
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    throw new ValidationError('projectId is required');
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

  return createSuccessResponse(result, 200);
}, 'memory-api');

