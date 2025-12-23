/**
 * Scope checker (leash) - enforces task scope constraints
 * 
 * This module validates that file changes stay within the allowed scope
 * for a task, preventing agents from making changes outside their assigned work.
 */

import type { ChangesetManifest, ScopeResult, TaskConstraints, ProjectRules } from '../types';
import { getTask } from '../services/tasks';
import { getProject } from '../services/projects';
import { emitEvent } from '../events';
import { validateUUID } from '../validation';

/**
 * Asserts that a changeset is within the allowed scope for a task
 * 
 * This function:
 * 1. Loads task constraints (allowedPaths, forbiddenPaths, maxFiles)
 * 2. Loads project rules as fallback/defaults
 * 3. Validates the changeset against these constraints
 * 4. Emits a ScopeAsserted event
 * 5. Returns pass/fail with violations
 * 
 * @param userId - User ID
 * @param taskId - Task ID to check scope for
 * @param changeset - Changeset manifest with file changes
 * @returns Scope validation result
 */
export async function assertInScope(
  userId: string,
  taskId: string,
  changeset: ChangesetManifest
): Promise<ScopeResult> {
  try {
    validateUUID(userId, 'userId');
    validateUUID(taskId, 'taskId');

    // Validate changeset structure
    if (!changeset || typeof changeset !== 'object') {
      throw new Error('Invalid changeset manifest');
    }

    if (!Array.isArray(changeset.filesChanged) ||
        !Array.isArray(changeset.filesAdded) ||
        !Array.isArray(changeset.filesDeleted)) {
      throw new Error('Changeset manifest must have filesChanged, filesAdded, and filesDeleted arrays');
    }

    // Get task and project
    const task = await getTask(userId, taskId);
    const taskData = task as any;
    const project = await getProject(userId, task.project_id);
    const projectData = project as any;

    // Load constraints
    const taskConstraints: TaskConstraints = (taskData.constraints || {}) as TaskConstraints;
    const projectRules: ProjectRules = (projectData.rules || {}) as ProjectRules;

    // Combine all files from the changeset
    const allFiles = [
      ...changeset.filesChanged,
      ...changeset.filesAdded,
      ...changeset.filesDeleted,
    ];

    const violations: string[] = [];

    // Check maxFiles constraint (task-level only)
    if (taskConstraints.maxFiles !== undefined && allFiles.length > taskConstraints.maxFiles) {
      violations.push(
        `Exceeds maximum file limit: ${allFiles.length} files changed (limit: ${taskConstraints.maxFiles})`
      );
    }

    // Get allowed and forbidden paths
    // Task constraints take precedence over project rules
    const allowedPaths = taskConstraints.allowedPaths || projectRules.allowedPaths || [];
    const forbiddenPaths = taskConstraints.forbiddenPaths || projectRules.forbiddenPaths || [];

    // Check each file against constraints
    for (const file of allFiles) {
      // Check forbidden paths first (most restrictive)
      for (const forbiddenPath of forbiddenPaths) {
        if (matchesPath(file, forbiddenPath)) {
          violations.push(`File "${file}" is in forbidden path: ${forbiddenPath}`);
        }
      }

      // If allowed paths are specified, check that file matches at least one
      if (allowedPaths.length > 0) {
        const matchesAnyAllowed = allowedPaths.some((allowedPath) =>
          matchesPath(file, allowedPath)
        );
        if (!matchesAnyAllowed) {
          violations.push(
            `File "${file}" is not in any allowed path. Allowed paths: ${allowedPaths.join(', ')}`
          );
        }
      }
    }

    const allowed = violations.length === 0;
    const reason = allowed
      ? 'All changes are within the allowed scope'
      : `Scope violations found: ${violations.length} violation(s)`;

    // Emit ScopeAsserted event
    await emitEvent({
      project_id: task.project_id,
      task_id: taskId,
      user_id: userId,
      event_type: 'ScopeAsserted',
      payload: {
        task_id: taskId,
        changeset: {
          filesChanged: changeset.filesChanged,
          filesAdded: changeset.filesAdded,
          filesDeleted: changeset.filesDeleted,
        },
        allowed,
        reason,
        violations: violations.length > 0 ? violations : undefined,
      },
    });

    return {
      allowed,
      reason,
      violations: violations.length > 0 ? violations : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw error;
  }
}

/**
 * Checks if a file path matches a pattern
 * 
 * Supports:
 * - Exact matches: "src/index.ts" matches "src/index.ts"
 * - Directory matches: "src/" matches all files in src/ and subdirectories
 * - Prefix matches: "src" matches "src/index.ts", "src/utils/helper.ts", etc.
 * 
 * @param filePath - File path to check
 * @param pattern - Pattern to match against
 * @returns True if file matches pattern
 */
function matchesPath(filePath: string, pattern: string): boolean {
  // Normalize paths (remove leading/trailing slashes for comparison)
  const normalizedFile = filePath.replace(/^\/+|\/+$/g, '');
  const normalizedPattern = pattern.replace(/^\/+|\/+$/g, '');

  // Exact match
  if (normalizedFile === normalizedPattern) {
    return true;
  }

  // Directory/prefix match: file must start with pattern followed by /
  // This ensures "src" matches "src/index.ts" but not "srcode/index.ts"
  if (normalizedFile.startsWith(normalizedPattern + '/')) {
    return true;
  }

  // If pattern ends with /, also check direct prefix match (for patterns like "src/")
  // This handles the case where pattern is explicitly a directory
  if (pattern.endsWith('/') && normalizedFile.startsWith(normalizedPattern)) {
    return true;
  }

  return false;
}

