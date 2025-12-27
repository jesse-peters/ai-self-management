import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { getProject, UnauthorizedError, NotFoundError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';
import type { ProjectManifest } from '@projectflow/core';

/**
 * GET /api/projects/[id]/manifest
 * Generates a .pm/project.json manifest file for linking a local repository to a SaaS project
 */
export const GET = withErrorHandler(
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
        const project = await getProject(supabase, id);

        if (!project) {
            throw new NotFoundError('Project not found');
        }

        // Generate the project manifest
        const manifest: ProjectManifest = {
            version: '1.0.0',
            projectId: project.id,
            projectName: project.name,
            repoRoot: '', // User will fill this in when they paste it, or MCP server will discover it
            createdAt: project.created_at,
            updatedAt: project.updated_at,
        };

        return createSuccessResponse({ manifest }, 200);
    },
    'projects-manifest-api'
);

