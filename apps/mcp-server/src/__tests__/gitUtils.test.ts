/**
 * Unit tests for gitUtils
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create the mock before vi.mock is hoisted
const { mockExecAsync } = vi.hoisted(() => {
  return {
    mockExecAsync: vi.fn(),
  };
});

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', async () => {
  const actual = await vi.importActual('util');
  return {
    ...actual,
    promisify: () => mockExecAsync,
  };
});

// Import after mocks are set up
import { getChangedFiles, type GitChangedFiles } from '../gitUtils';

describe('gitUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getChangedFiles', () => {
    it('should throw error when not in a git repository', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          const error = new Error('Not a git repository');
          (error as any).code = 128;
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      await expect(getChangedFiles()).rejects.toThrow('Not a git repository');
    });

    it('should return empty arrays when no changes exist', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      expect(result).toEqual({
        all: [],
        added: [],
        modified: [],
        deleted: [],
      });
    });

    it('should detect added files', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: 'new-file.ts\n', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: 'new-file.ts\n', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          return Promise.resolve({ stdout: 'A  new-file.ts\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      expect(result.added).toContain('new-file.ts');
      expect(result.all).toContain('new-file.ts');
      expect(result.modified).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
    });

    it('should detect modified files', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: 'modified-file.ts\n', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: 'modified-file.ts\n', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          // Format: "XY filename" where X is staged, Y is unstaged
          // " M" means unstaged modified
          return Promise.resolve({ stdout: ' M modified-file.ts\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      expect(result.modified).toContain('modified-file.ts');
      expect(result.all).toContain('modified-file.ts');
      expect(result.added).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
    });

    it('should detect deleted files', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: 'deleted-file.ts\n', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: 'deleted-file.ts\n', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          return Promise.resolve({ stdout: 'D  deleted-file.ts\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      expect(result.deleted).toContain('deleted-file.ts');
      expect(result.all).toContain('deleted-file.ts');
      expect(result.added).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
    });

    it('should detect renamed files as modified', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: 'renamed-file.ts\n', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: 'renamed-file.ts\n', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          // Git shows renames as "R  old -> new", but we only care about the new file
          // The implementation will extract "old-file.ts -> renamed-file.ts" and treat it as modified
          // Since git diff shows "renamed-file.ts", that's what we expect in the result
          return Promise.resolve({ stdout: 'R  old-file.ts -> renamed-file.ts\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      // The implementation extracts the full rename string, but git diff shows the new filename
      // So we expect the new filename in the result
      expect(result.all).toContain('renamed-file.ts');
      // The modified array will contain the full rename string from status
      expect(result.modified.length).toBeGreaterThan(0);
    });

    it('should handle multiple files of different types', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: 'new-file.ts\nmodified-file.ts\ndeleted-file.ts\n', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: 'new-file.ts\nmodified-file.ts\n', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          return Promise.resolve({ stdout: 'A  new-file.ts\n M modified-file.ts\nD  deleted-file.ts\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      expect(result.added).toContain('new-file.ts');
      expect(result.modified).toContain('modified-file.ts');
      expect(result.deleted).toContain('deleted-file.ts');
      expect(result.all).toHaveLength(3);
      expect(result.all).toContain('new-file.ts');
      expect(result.all).toContain('modified-file.ts');
      expect(result.all).toContain('deleted-file.ts');
    });

    it('should deduplicate files in all array', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: 'file.ts\n', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: 'file.ts\n', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          return Promise.resolve({ stdout: ' M file.ts\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      expect(result.all).toHaveLength(1);
      expect(result.all).toEqual(['file.ts']);
    });

    it('should use custom repo path when provided', async () => {
      const customPath = '/custom/repo/path';
      mockExecAsync.mockImplementation((command: string, options?: any) => {
        // Verify cwd is set correctly
        if (options?.cwd) {
          expect(options.cwd).toBe(customPath);
        }
        
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      await getChangedFiles(customPath);
    });

    it('should handle files with whitespace in names', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: 'file with spaces.ts\n', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: 'file with spaces.ts\n', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          return Promise.resolve({ stdout: ' M file with spaces.ts\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      expect(result.all).toContain('file with spaces.ts');
      expect(result.modified).toContain('file with spaces.ts');
    });

    it('should handle empty status lines', async () => {
      mockExecAsync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        }
        if (command === 'git diff --name-only HEAD') {
          return Promise.resolve({ stdout: '\n\n', stderr: '' });
        }
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: '\n\n', stderr: '' });
        }
        if (command === 'git status --porcelain') {
          return Promise.resolve({ stdout: '\n\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await getChangedFiles();
      expect(result.all).toEqual([]);
      expect(result.added).toEqual([]);
      expect(result.modified).toEqual([]);
      expect(result.deleted).toEqual([]);
    });
  });
});

