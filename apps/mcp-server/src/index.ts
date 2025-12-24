/**
 * Public exports from ProjectFlow MCP Server
 * Provides access to the shared server factory and MCP tools/resources/prompts
 */

export { createMCPServer, type AuthContextProvider } from './serverFactory';
export { tools } from './tools';
export { prompts, getPrompt } from './prompts';
export { listResources, readResource } from './resources';
export { routeToolCall } from './handlers';
export { mapErrorToMCP } from './errors';
export { resolveUserId, extractUserId, validateUserIdFormat } from './auth';
