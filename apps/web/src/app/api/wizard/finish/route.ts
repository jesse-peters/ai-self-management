import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { finishWizard, UnauthorizedError, ValidationError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new UnauthorizedError('Authentication required');
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
        throw new ValidationError('Missing required field: sessionId', 'sessionId');
    }

    // Finish wizard and create project
    const result = await finishWizard(supabase, sessionId);

    return createSuccessResponse(result, 200);
}, 'wizard-api');

