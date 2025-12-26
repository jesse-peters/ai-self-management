/**
 * MCP authentication utilities
 * 
 * This module provides helper functions for MCP authentication.
 * The actual token verification is done directly in the route handlers
 * using the SDK v1.25.1 AuthInfo format.
 */

/**
 * Helper to check if a method requires authentication
 * 
 * @param method The JSON-RPC method name
 * @returns true if the method requires authentication
 */
export function methodRequiresAuth(method: string): boolean {
  // Methods that don't require auth
  const publicMethods = [
    'initialize',
    'ping',
    'notifications/initialized',
  ];

  return !publicMethods.includes(method);
}

