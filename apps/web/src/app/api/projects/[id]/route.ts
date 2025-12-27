import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { deleteProject, UnauthorizedError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

/**
 * DELETE /api/projects/[id]
 * Deletes a project
 */
export const DELETE = withErrorHandler(
    async (
        request: NextRequest,
        context?: { params?: Promise<Record<string, string>> }
    ): Promise<NextResponse> => {
        const supabase = await createServerClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new UnauthorizedError('Authentication required');
        }

        const params = await context!.params!;
        const id = params.id;

        await deleteProject(supabase, id, user.id);

        return createSuccessResponse({ success: true }, 200);
    },
    'projects-api'
);

