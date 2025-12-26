import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { listOutcomes } from '@projectflow/core';

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
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const subjectType = searchParams.get('subjectType') as any;
        const result = searchParams.get('result') as any;
        const limitStr = searchParams.get('limit');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Get authenticated user
        const supabase = await createServerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        return NextResponse.json({ outcomes });
    } catch (error) {
        console.error('Error fetching outcomes:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

