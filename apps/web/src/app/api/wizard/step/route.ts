import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { submitWizardStep } from '@projectflow/core';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, stepId, payload } = body;

    if (!sessionId || typeof stepId !== 'number' || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, stepId, payload' },
        { status: 400 }
      );
    }

    // Submit wizard step
    const result = await submitWizardStep(sessionId, stepId, payload);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error submitting wizard step:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit step' },
      { status: 500 }
    );
  }
}

