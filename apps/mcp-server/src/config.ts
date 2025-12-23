/**
 * Configuration utilities for MCP server
 */

export interface Config {
  userId?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  return {
    userId: process.env.MCP_USER_ID,
    logLevel: (process.env.MCP_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  };
}

/**
 * Get the current configuration
 */
let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  config = null;
}

