import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@projectflow/db';
import { createRequestLogger } from '@/lib/logger';
import { getCorrelationId } from '@/lib/correlationId';

/**
 * Debug Status Endpoint
 * Provides health check for all services and validates configuration
 * 
 * Returns:
 * - Database connectivity status
 * - OAuth configuration validation
 * - Environment variable checks
 * - Service health indicators
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const correlationId = getCorrelationId(request);
    const logger = createRequestLogger(correlationId, 'debug');

    logger.info('Debug status check initiated');

    const status = {
        timestamp: new Date().toISOString(),
        correlationId,
        services: {
            database: await checkDatabase(logger),
            oauth: checkOAuthConfig(logger),
            environment: checkEnvironment(logger),
        },
        overall: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
    };

    // Determine overall health
    const serviceStatuses = [
        status.services.database.status,
        status.services.oauth.status,
        status.services.environment.status,
    ];

    if (serviceStatuses.every(s => s === 'healthy')) {
        status.overall = 'healthy';
    } else if (serviceStatuses.some(s => s === 'unhealthy')) {
        status.overall = 'unhealthy';
    } else {
        status.overall = 'degraded';
    }

    const httpStatus = status.overall === 'healthy' ? 200 :
        status.overall === 'degraded' ? 207 : 503;

    logger.info({ overall: status.overall, httpStatus }, 'Debug status check completed');

    return NextResponse.json(status, { status: httpStatus });
}

/**
 * Check database connectivity
 */
async function checkDatabase(logger: ReturnType<typeof createRequestLogger>) {
    const result = {
        status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
        message: '',
        details: {} as Record<string, unknown>,
    };

    try {
        const client = createServiceRoleClient();

        // Test basic connectivity with a simple query
        const { data, error } = await client
            .from('projects')
            .select('count')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            throw error;
        }

        result.status = 'healthy';
        result.message = 'Database connection successful';
        result.details = {
            connected: true,
            queryExecuted: true,
        };

        logger.debug('Database health check passed');
    } catch (error) {
        result.status = 'unhealthy';
        result.message = error instanceof Error ? error.message : 'Database connection failed';
        result.details = {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };

        logger.error({ error: result.details.error }, 'Database health check failed');
    }

    return result;
}

/**
 * Check OAuth configuration
 */
function checkOAuthConfig(logger: ReturnType<typeof createRequestLogger>) {
    const result = {
        status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
        message: '',
        details: {} as Record<string, unknown>,
    };

    const requiredVars = [
        'JWT_SECRET',
        'NEXT_PUBLIC_APP_URL',
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);
    const hasAppUrl = !!process.env.NEXT_PUBLIC_APP_URL;

    result.details = {
        jwtSecretConfigured: !!process.env.JWT_SECRET,
        appUrlConfigured: hasAppUrl,
        appUrl: hasAppUrl ? process.env.NEXT_PUBLIC_APP_URL : undefined,
        missingVariables: missingVars,
    };

    if (missingVars.length === 0) {
        result.status = 'healthy';
        result.message = 'OAuth configuration valid';
        logger.debug('OAuth configuration check passed');
    } else {
        result.status = 'unhealthy';
        result.message = `Missing required environment variables: ${missingVars.join(', ')}`;
        logger.warn({ missingVars }, 'OAuth configuration check failed');
    }

    return result;
}

/**
 * Check environment configuration
 */
function checkEnvironment(logger: ReturnType<typeof createRequestLogger>) {
    const result = {
        status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
        message: '',
        details: {} as Record<string, unknown>,
    };

    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

    result.details = {
        nodeEnv: process.env.NODE_ENV,
        supabaseConfigured: !!supabaseUrl,
        supabaseUrl: supabaseUrl ? maskUrl(supabaseUrl) : undefined,
        missingVariables: missingVars,
        logLevel: process.env.LOG_LEVEL || 'info',
    };

    if (missingVars.length === 0) {
        result.status = 'healthy';
        result.message = 'Environment configuration valid';
        logger.debug('Environment check passed');
    } else if (missingVars.length <= 2) {
        result.status = 'degraded';
        result.message = `Some environment variables missing: ${missingVars.join(', ')}`;
        logger.warn({ missingVars }, 'Environment check degraded');
    } else {
        result.status = 'unhealthy';
        result.message = `Critical environment variables missing: ${missingVars.join(', ')}`;
        logger.error({ missingVars }, 'Environment check failed');
    }

    return result;
}

/**
 * Mask sensitive parts of URLs for logging
 */
function maskUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
        return '[invalid-url]';
    }
}

