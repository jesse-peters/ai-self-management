/**
 * Tests for scope checker (leash enforcement)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assertInScope } from '../checker';
import type { ChangesetManifest } from '../../types';

// Mock dependencies
vi.mock('../../services/tasks', () => ({
  getTask: vi.fn(),
}));

vi.mock('../../services/projects', () => ({
  getProject: vi.fn(),
}));

vi.mock('../../events', () => ({
  emitEvent: vi.fn(),
}));

import { getTask } from '../../services/tasks';
import { getProject } from '../../services/projects';
import { emitEvent } from '../../events';

describe('assertInScope', () => {
  const mockUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const mockTaskId = '550e8400-e29b-41d4-a716-446655440000';
  const mockProjectId = '650e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('allowed paths', () => {
    it('should allow changes within allowed paths', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          allowedPaths: ['src/', 'tests/'],
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts', 'src/utils/helper.ts'],
        filesAdded: ['tests/index.test.ts'],
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('All changes are within the allowed scope');
      expect(result.violations).toBeUndefined();
    });

    it('should reject changes outside allowed paths', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          allowedPaths: ['src/'],
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts'],
        filesAdded: ['config.json'], // Outside allowed path
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(false);
      expect(result.violations).toBeDefined();
      expect(result.violations?.length).toBeGreaterThan(0);
      expect(result.violations?.[0]).toContain('config.json');
      expect(result.violations?.[0]).toContain('not in any allowed path');
    });
  });

  describe('forbidden paths', () => {
    it('should reject changes in forbidden paths', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          forbiddenPaths: ['node_modules/', '.git/'],
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts'],
        filesAdded: ['node_modules/package/index.js'], // In forbidden path
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(false);
      expect(result.violations).toBeDefined();
      expect(result.violations?.some(v => v.includes('node_modules'))).toBe(true);
    });

    it('should allow changes when forbidden paths are not violated', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          forbiddenPaths: ['node_modules/'],
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts'],
        filesAdded: ['src/utils.ts'],
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(true);
    });
  });

  describe('maxFiles constraint', () => {
    it('should reject when maxFiles limit is exceeded', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          maxFiles: 2,
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/file1.ts', 'src/file2.ts'],
        filesAdded: ['src/file3.ts'], // Total: 3 files, exceeds limit of 2
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(false);
      expect(result.violations).toBeDefined();
      expect(result.violations?.some(v => v.includes('Exceeds maximum file limit'))).toBe(true);
    });

    it('should allow when maxFiles limit is not exceeded', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          maxFiles: 5,
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/file1.ts', 'src/file2.ts'],
        filesAdded: ['src/file3.ts'],
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(true);
    });
  });

  describe('project rules as fallback', () => {
    it('should use project rules when task constraints are not set', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {},
      };

      const mockProject = {
        id: mockProjectId,
        rules: {
          allowedPaths: ['src/'],
        },
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts'],
        filesAdded: [],
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(true);
    });

    it('should prefer task constraints over project rules', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          allowedPaths: ['src/'],
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {
          allowedPaths: ['lib/'], // Different from task constraint
        },
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts'], // Matches task constraint, not project rule
        filesAdded: [],
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(true);
    });
  });

  describe('path matching', () => {
    it('should match exact file paths', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          allowedPaths: ['src/index.ts'],
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts'],
        filesAdded: [],
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(true);
    });

    it('should match directory prefixes', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          allowedPaths: ['src'],
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts', 'src/utils/helper.ts'],
        filesAdded: [],
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(true);
    });

    it('should match directory paths ending with slash', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {
          allowedPaths: ['src/'],
        },
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts'],
        filesAdded: [],
        filesDeleted: [],
      };

      const result = await assertInScope(mockUserId, mockTaskId, changeset);

      expect(result.allowed).toBe(true);
    });
  });

  describe('event emission', () => {
    it('should emit ScopeAsserted event', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {},
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(emitEvent).mockResolvedValue({} as any);

      const changeset: ChangesetManifest = {
        filesChanged: ['src/index.ts'],
        filesAdded: [],
        filesDeleted: [],
      };

      await assertInScope(mockUserId, mockTaskId, changeset);

      expect(emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'ScopeAsserted',
          project_id: mockProjectId,
          task_id: mockTaskId,
          user_id: mockUserId,
          payload: expect.objectContaining({
            allowed: true,
            changeset: expect.objectContaining({
              filesChanged: ['src/index.ts'],
            }),
          }),
        })
      );
    });
  });

  describe('validation', () => {
    it('should throw error for invalid changeset structure', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        constraints: {},
      };

      const mockProject = {
        id: mockProjectId,
        rules: {},
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);

      const invalidChangeset = {
        filesChanged: 'not an array',
      } as any;

      await expect(assertInScope(mockUserId, mockTaskId, invalidChangeset)).rejects.toThrow();
    });
  });
});

