import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { submitWizardStep, UnauthorizedError, ValidationError } from '@projectflow/core';
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
  const { sessionId, stepId, payload } = body;

  if (!sessionId || typeof stepId !== 'number' || !payload) {
    throw new ValidationError('Missing required fields: sessionId, stepId, payload');
  }

  // Submit wizard step
  const result = await submitWizardStep(sessionId, stepId, payload);

  return createSuccessResponse(result, 200);
}, 'wizard-api');

