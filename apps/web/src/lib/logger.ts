/**
 * Structured logging utility using Pino
 * Provides pretty-printed logs in development and JSON logs in production
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = (process.env.LOG_LEVEL as pino.Level) || 'info';

// Create base logger with environment-based configuration
const baseLogger = pino({
    level: logLevel,
    ...(isDevelopment && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
            },
        },
    }),
    base: {
        env: process.env.NODE_ENV || 'development',
    },
});

/**
 * Create a child logger for a specific module
 * @param module - Module name (e.g., 'mcp', 'oauth')
 * @returns Child logger instance
 */
export function createModuleLogger(module: string) {
    return baseLogger.child({ module });
}

/**
 * Default logger instance
 */
export const logger = baseLogger;

/**
 * Create a logger with correlation ID for request tracking
 * @param correlationId - Unique correlation ID for the request
 * @param module - Optional module name
 * @returns Logger instance with correlation ID
 */
export function createRequestLogger(correlationId: string, module?: string) {
    const base = module ? baseLogger.child({ module }) : baseLogger;
    return base.child({ correlationId });
}




