import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@projectflow/db';
import { verifyAccessToken, type MCPTokenClaims } from '@projectflow/core';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

/**
 * Debug Context Endpoint
 * Provides comprehensive debugging information in LLM-friendly format
 * 
 * Returns copyable JSON with:
 * - Environment info (non-sensitive)
 * - Recent errors from database
 * - OAuth token status (if provided)
 * - MCP connection state
 * - System diagnostics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'debug');

    logger.info('Debug context request initiated');

    // Extract authorization header if present
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const context = {
        timestamp: new Date().toISOString(),
        correlationId,
        environment: getEnvironmentInfo(),
        oauth: token ? await getOAuthStatus(token, logger) : null,
        recentErrors: await getRecentErrors(logger),
        system: getSystemInfo(),
        instructions: {
            usage: 'Copy this entire JSON object when asking for help with debugging',
            note: 'Sensitive data has been masked for security',
        },
    };

    logger.info('Debug context generated successfully');

    return NextResponse.json(context, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
    });
}

/**
 * Get non-sensitive environment information
 */
function getEnvironmentInfo() {
    return {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        platform: process.platform,
        nodeVersion: process.version,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || '[not-configured]',
        supabaseConfigured: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        jwtConfigured: !!process.env.JWT_SECRET,
        logLevel: process.env.LOG_LEVEL || 'info',
    };
}

/**
 * Get OAuth token status and information
 */
async function getOAuthStatus(token: string, logger: ReturnType<typeof createRequestLogger>) {
    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        const audience = `${appUrl}/api/mcp`;
        const claims = await verifyAccessToken(token, audience) as MCPTokenClaims;

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = claims.exp ? claims.exp - now : null;
        const age = claims.iat ? now - claims.iat : null;

        return {
            valid: true,
            userId: claims.sub,
            email: claims.email || 'unknown',
            role: claims.role,
            issuedAt: claims.iat ? new Date(claims.iat * 1000).toISOString() : 'unknown',
            expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : 'unknown',
            expiresIn: expiresIn !== null ? `${Math.floor(expiresIn / 60)} minutes` : 'unknown',
            age: age !== null ? `${Math.floor(age / 60)} minutes` : 'unknown',
            isExpired: expiresIn !== null && expiresIn <= 0,
            willExpireSoon: expiresIn !== null && expiresIn > 0 && expiresIn < 300, // Less than 5 minutes
        };
    } catch (error) {
        logger.debug({ error: error instanceof Error ? error.message : 'Unknown' }, 'Token verification failed');
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid token',
        };
    }
}

/**
 * Get recent errors from the database
 */
async function getRecentErrors(logger: ReturnType<typeof createRequestLogger>) {
    try {
        const client = createServiceRoleClient();

        // Get recent events with errors (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await client
            .from('events')
            .select('id, event_type, created_at, payload')
            .gte('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            logger.warn({ error: error.message }, 'Failed to fetch recent errors');
            return {
                available: false,
                error: error.message,
            };
        }

        // Filter for events that might indicate errors
        const errorEvents = data?.filter(event =>
            event.event_type.includes('error') ||
            event.event_type.includes('failed') ||
            (event.payload as any)?.error
        ) || [];

        return {
            available: true,
            count: errorEvents.length,
            events: errorEvents.slice(0, 5).map(event => ({
                id: event.id,
                type: event.event_type,
                timestamp: event.created_at,
                error: (event.payload as any)?.error || 'Unknown error',
            })),
            note: errorEvents.length > 5 ? `Showing 5 of ${errorEvents.length} error events` : undefined,
        };
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Error fetching recent errors');
        return {
            available: false,
            error: error instanceof Error ? error.message : 'Failed to fetch errors',
        };
    }
}

/**
 * Get system diagnostic information
 */
function getSystemInfo() {
    const memoryUsage = process.memoryUsage();

    return {
        uptime: `${Math.floor(process.uptime() / 60)} minutes`,
        memory: {
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        },
        process: {
            pid: process.pid,
            platform: process.platform,
            arch: process.arch,
        },
    };
}

/**
 * POST endpoint for submitting error reports
 * Allows clients to submit errors they encounter for debugging
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'debug');

    logger.info('Error report submission received');

    try {
        const body = await request.json();

        // Log the error report
        logger.error({
            userAgent: request.headers.get('user-agent'),
            referer: request.headers.get('referer'),
            report: body,
        }, 'User-submitted error report');

        // Optionally store in database (requires project_id and user_id, so skip if not available)
        // Note: This is a debug endpoint, so we don't always have project/user context
        try {
            const client = createServiceRoleClient();
            // Only insert if we have the required fields - for now, skip the insert
            // as this is a debug endpoint without project/user context
            // await client.from('events').insert({
            //     event_type: 'debug.error_report',
            //     project_id: '...', // Would need to be provided
            //     user_id: '...', // Would need to be provided
            //     payload: {
            //         correlationId,
            //         userAgent: request.headers.get('user-agent'),
            //         report: body,
            //     },
            // });
        } catch (dbError) {
            // Silently fail - this is optional
            logger.debug({ error: dbError }, 'Skipped optional event insert');
        }

        return NextResponse.json({
            success: true,
            correlationId,
            message: 'Error report received',
        });
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Failed to process error report');

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process error report',
        }, { status: 500 });
    }
}

