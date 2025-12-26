import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseClient';
import { startWizard } from '@projectflow/core';

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

    // Start wizard session
    const sessionId = await startWizard(supabase);

    return NextResponse.json({ sessionId, step: 1 });
  } catch (error) {
    console.error('Error starting wizard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start wizard' },
      { status: 500 }
    );
  }
}

