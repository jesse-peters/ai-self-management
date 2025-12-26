import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { listOutcomes, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * GET /api/outcomes
 * Lists outcomes for a project with optional filters
 * 
 * Query params:
 * - projectId (required): Project ID
 * - subjectType (optional): Filter by subject type (decision, task, gate, checkpoint)
 * - result (optional): Filter by result (worked, didnt_work, mixed, unknown)
 * - limit (optional): Maximum number of outcomes to return
 */
export const GET = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const subjectType = searchParams.get('subjectType') as any;
    const result = searchParams.get('result') as any;
    const limitStr = searchParams.get('limit');

    if (!projectId) {
        throw new ValidationError('projectId is required');
    }

    // Get authenticated user
    const supabase = await createServerClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new UnauthorizedError('Authentication required');
    }

    const userId = user.id;

    // Build filters
    const filters: any = {};
    if (subjectType) {
        filters.subject_type = subjectType;
    }
    if (result) {
        filters.result = result;
    }
    if (limitStr) {
        filters.limit = parseInt(limitStr, 10);
    }

    const outcomes = await listOutcomes(userId, projectId, filters);

    return createSuccessResponse({ outcomes });
}, 'outcomes-api');

