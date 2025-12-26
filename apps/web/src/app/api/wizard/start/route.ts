import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { startWizard, UnauthorizedError } from '@projectflow/core';
import { withErrorHandler } from '@/lib/api/withErrorHandler';
import { createSuccessResponse } from '@/lib/errors/responses';

export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse> => {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new UnauthorizedError('Authentication required');
    }

    // Start wizard session
    const sessionId = await startWizard(supabase);

    return createSuccessResponse({ sessionId, step: 1 }, 200);
}, 'wizard-api');

