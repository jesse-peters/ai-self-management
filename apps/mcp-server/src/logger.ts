/**
 * Simple logging utility for MCP server
 */

import { getConfig } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelValues: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  const config = getConfig();
  return levelValues[level] >= levelValues[config.logLevel];
}

function formatLog(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  let output = `[${timestamp}] ${levelStr} ${message}`;
  if (data) {
    output += ` ${JSON.stringify(data)}`;
  }
  return output;
}

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (shouldLog('debug')) {
      console.error(formatLog('debug', message, data));
    }
  },
  info: (message: string, data?: unknown) => {
    if (shouldLog('info')) {
      console.error(formatLog('info', message, data));
    }
  },
  warn: (message: string, data?: unknown) => {
    if (shouldLog('warn')) {
      console.error(formatLog('warn', message, data));
    }
  },
  error: (message: string, data?: unknown) => {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, data));
    }
  },
};

