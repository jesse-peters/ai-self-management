import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens } from '@projectflow/core';

/**
 * Token Refresh Worker (Cron Job)
 * 
 * This endpoint should be called periodically (e.g., via Vercel Cron) to:
 * - Clean up expired and revoked tokens
 * - Optionally refresh tokens that are about to expire
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/refresh-tokens",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify this is a cron request (Vercel sets this header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clean up expired tokens
    const deletedCount = await cleanupExpiredTokens();

    return NextResponse.json(
      {
        success: true,
        message: `Cleaned up ${deletedCount} expired tokens`,
        deletedCount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Token refresh worker error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request);
}

