/**
 * MCP Resource definitions and handlers for ProjectFlow
 * Resources provide read-only views of project data via pm:// URIs
 */

import {
  listProjects,
  getProject,
  listTasks,
  getTask,
  listArtifacts,
  getCheckpoint,
  listCheckpoints,
  getProjectEvents,
  getTaskEvents,
  listDecisions,
} from '@projectflow/core';
import { resolveUserId } from './auth';
import type { Project, Task, Artifact, Checkpoint, Event, Decision } from '@projectflow/core';

/**
 * Resource URI patterns:
 * - pm://projects - List all projects
 * - pm://project/{projectId} - Project details + rules
 * - pm://project/{projectId}/tasks?status=in_progress - All tasks (filterable)
 * - pm://task/{taskId} - Task details with criteria, constraints, artifacts
 * - pm://task/{taskId}/events - Event timeline for task
 * - pm://checkpoint/{checkpointId} - Checkpoint details
 * - pm://project/{projectId}/timeline - Full event timeline
 * - pm://project/{projectId}/decisions - Decision log
 */

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Parses a pm:// URI and extracts components
 */
export function parseResourceUri(uri: string): {
  type: string;
  projectId?: string;
  taskId?: string;
  checkpointId?: string;
  path?: string;
  query?: Record<string, string>;
} {
  if (!uri.startsWith('pm://')) {
    throw new Error(`Invalid resource URI: ${uri}. Must start with pm://`);
  }

  const url = new URL(uri.replace('pm://', 'https://'));
  const pathParts = url.pathname.split('/').filter(Boolean);

  const result: any = {
    type: pathParts[0] || 'projects',
  };

  if (result.type === 'project' && pathParts[1]) {
    result.projectId = pathParts[1];
    if (pathParts[2]) {
      result.path = pathParts[2];
    }
  } else if (result.type === 'task' && pathParts[1]) {
    result.taskId = pathParts[1];
    if (pathParts[2]) {
      result.path = pathParts[2];
    }
  } else if (result.type === 'checkpoint' && pathParts[1]) {
    result.checkpointId = pathParts[1];
  }

  // Parse query parameters
  if (url.searchParams) {
    result.query = Object.fromEntries(url.searchParams.entries());
  }

  return result;
}

/**
 * Lists available resources for a user
 * Returns resources in MCP format
 */
export async function listResources(userId: string): Promise<Array<{ uri: string; name: string; description?: string; mimeType?: string }>> {
  const projects = await listProjects(userId);
  
  const resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }> = [
    {
      uri: 'pm://projects',
      name: 'All Projects',
      description: 'List of all projects for the user',
      mimeType: 'application/json',
    },
  ];

  // Add project-specific resources
  for (const project of projects) {
    resources.push({
      uri: `pm://project/${project.id}`,
      name: `Project: ${project.name}`,
      description: `Project details and rules for ${project.name}`,
      mimeType: 'application/json',
    });
    resources.push({
      uri: `pm://project/${project.id}/tasks`,
      name: `Tasks: ${project.name}`,
      description: `All tasks for ${project.name}`,
      mimeType: 'application/json',
    });
    resources.push({
      uri: `pm://project/${project.id}/timeline`,
      name: `Timeline: ${project.name}`,
      description: `Event timeline for ${project.name}`,
      mimeType: 'application/json',
    });
    resources.push({
      uri: `pm://project/${project.id}/decisions`,
      name: `Decisions: ${project.name}`,
      description: `Decision log for ${project.name}`,
      mimeType: 'application/json',
    });
  }

  // Task-specific resources are discovered dynamically when clients query project tasks
  // Checkpoint resources are discovered when clients query project checkpoints

  return resources;
}

/**
 * Reads a resource by URI
 */
export async function readResource(
  userId: string,
  uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text?: string; blob?: string }> }> {
  const parsed = parseResourceUri(uri);

  try {
    switch (parsed.type) {
      case 'projects': {
        const projects = await listProjects(userId);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case 'project': {
        if (!parsed.projectId) {
          throw new Error('Project ID required in URI');
        }

        if (parsed.path === 'tasks') {
          // Get tasks with optional filters
          const status = parsed.query?.status as any;
          const priority = parsed.query?.priority as any;
          const tasks = await listTasks(userId, parsed.projectId, { status, priority });
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(tasks, null, 2),
              },
            ],
          };
        }

        if (parsed.path === 'timeline') {
          const events = await getProjectEvents(parsed.projectId, 100);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(events, null, 2),
              },
            ],
          };
        }

        if (parsed.path === 'decisions') {
          const decisions = await listDecisions(userId, parsed.projectId);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(decisions, null, 2),
              },
            ],
          };
        }

        // Default: project details
        const project = await getProject(userId, parsed.projectId);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case 'task': {
        if (!parsed.taskId) {
          throw new Error('Task ID required in URI');
        }

        if (parsed.path === 'events') {
          const events = await getTaskEvents(parsed.taskId, 100);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(events, null, 2),
              },
            ],
          };
        }

        // Default: task details with artifacts
        const task = await getTask(userId, parsed.taskId);
        const artifacts = await listArtifacts(userId, parsed.taskId);
        
        const taskWithArtifacts = {
          ...task,
          artifacts,
        };

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(taskWithArtifacts, null, 2),
            },
          ],
        };
      }

      case 'checkpoint': {
        if (!parsed.checkpointId) {
          throw new Error('Checkpoint ID required in URI');
        }

        const checkpoint = await getCheckpoint(userId, parsed.checkpointId);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(checkpoint, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource type: ${parsed.type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
    };
  }
}

