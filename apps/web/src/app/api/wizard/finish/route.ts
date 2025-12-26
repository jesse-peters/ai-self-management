import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { finishWizard } from '@projectflow/core';

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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    // Finish wizard and create project
    const result = await finishWizard(supabase, sessionId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error finishing wizard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finish wizard' },
      { status: 500 }
    );
  }
}

