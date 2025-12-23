/**
 * Tests for gate evaluator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateGates } from '../evaluator';
import type { Gate, GateResult } from '../../types';

// Mock dependencies
vi.mock('../../services/artifacts', () => ({
  listArtifacts: vi.fn(),
}));

vi.mock('../../services/tasks', () => ({
  getTask: vi.fn(),
}));

vi.mock('../../services/projects', () => ({
  getProject: vi.fn(),
}));

import { listArtifacts } from '../../services/artifacts';
import { getTask } from '../../services/tasks';
import { getProject } from '../../services/projects';

describe('evaluateGates', () => {
  const mockUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const mockTaskId = '550e8400-e29b-41d4-a716-446655440000';
  const mockProjectId = '650e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('has_tests gate', () => {
    it('should pass when test artifacts exist', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'test_report', ref: 'test-results.json' },
      ] as any);

      const gates: Gate[] = [{ type: 'has_tests' }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
      expect(results[0].gate.type).toBe('has_tests');
      expect(results[0].reason).toContain('Found 1 test artifact');
    });

    it('should fail when no test artifacts exist', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([]);

      const gates: Gate[] = [{ type: 'has_tests' }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(false);
      expect(results[0].reason).toContain('No test artifacts found');
      expect(results[0].missingRequirements).toContain('test_report artifact');
    });
  });

  describe('has_docs gate', () => {
    it('should pass when document artifacts exist', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'document', ref: 'README.md' },
      ] as any);

      const gates: Gate[] = [{ type: 'has_docs' }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
      expect(results[0].gate.type).toBe('has_docs');
      expect(results[0].reason).toContain('Found 1 document artifact');
    });

    it('should fail when no document artifacts exist', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'diff', ref: 'changes.diff' },
      ] as any);

      const gates: Gate[] = [{ type: 'has_docs' }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(false);
      expect(results[0].reason).toContain('No document artifacts found');
      expect(results[0].missingRequirements).toContain('document artifact');
    });
  });

  describe('has_artifacts gate', () => {
    it('should pass when minimum artifact count is met', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'diff', ref: 'changes.diff' },
        { id: '2', type: 'pr', ref: 'pr-123' },
      ] as any);

      const gates: Gate[] = [{ type: 'has_artifacts', config: { minCount: 2 } }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
      expect(results[0].reason).toContain('Found 2 artifact(s)');
    });

    it('should fail when minimum artifact count is not met', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'diff', ref: 'changes.diff' },
      ] as any);

      const gates: Gate[] = [{ type: 'has_artifacts', config: { minCount: 2 } }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(false);
      expect(results[0].reason).toContain('Only 1 artifact(s) found');
      expect(results[0].missingRequirements).toContain('At least 2 artifact(s) required');
    });

    it('should default to minCount of 1 when not specified', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'diff', ref: 'changes.diff' },
      ] as any);

      const gates: Gate[] = [{ type: 'has_artifacts' }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
    });
  });

  describe('acceptance_met gate', () => {
    it('should pass when acceptance criteria exist and artifacts are present', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: ['Feature works', 'Tests pass'],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'diff', ref: 'changes.diff' },
      ] as any);

      const gates: Gate[] = [{ type: 'acceptance_met' }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
      expect(results[0].reason).toContain('Acceptance criteria appear to be met');
    });

    it('should pass when no acceptance criteria exist', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([]);

      const gates: Gate[] = [{ type: 'acceptance_met' }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
    });

    it('should fail when acceptance criteria exist but no artifacts', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: ['Feature works'],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([]);

      const gates: Gate[] = [{ type: 'acceptance_met' }];
      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(false);
      expect(results[0].reason).toContain('Acceptance criteria not yet met');
    });
  });

  describe('default gates from project rules', () => {
    it('should use default gates from project rules when no gates provided', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      const mockProject = {
        id: mockProjectId,
        rules: {
          defaultGates: ['has_tests', 'has_artifacts:minCount=2'],
        },
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue(mockProject as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'test_report', ref: 'test-results.json' },
        { id: '2', type: 'diff', ref: 'changes.diff' },
      ] as any);

      const results = await evaluateGates(mockUserId, mockTaskId);

      expect(results).toHaveLength(2);
      expect(results[0].gate.type).toBe('has_tests');
      expect(results[0].passed).toBe(true);
      expect(results[1].gate.type).toBe('has_artifacts');
      expect(results[1].passed).toBe(true);
    });

    it('should fall back to hardcoded defaults when project has no rules', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: [],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'diff', ref: 'changes.diff' },
      ] as any);

      const results = await evaluateGates(mockUserId, mockTaskId);

      expect(results).toHaveLength(2);
      expect(results[0].gate.type).toBe('has_artifacts');
      expect(results[1].gate.type).toBe('acceptance_met');
    });
  });

  describe('multiple gates', () => {
    it('should evaluate all gates and return results for each', async () => {
      const mockTask = {
        id: mockTaskId,
        project_id: mockProjectId,
        acceptance_criteria: ['Feature works'],
      };

      vi.mocked(getTask).mockResolvedValue(mockTask as any);
      vi.mocked(getProject).mockResolvedValue({ id: mockProjectId, rules: {} } as any);
      vi.mocked(listArtifacts).mockResolvedValue([
        { id: '1', type: 'test_report', ref: 'test-results.json' },
        { id: '2', type: 'document', ref: 'README.md' },
        { id: '3', type: 'diff', ref: 'changes.diff' },
      ] as any);

      const gates: Gate[] = [
        { type: 'has_tests' },
        { type: 'has_docs' },
        { type: 'has_artifacts', config: { minCount: 2 } },
        { type: 'acceptance_met' },
      ];

      const results = await evaluateGates(mockUserId, mockTaskId, gates);

      expect(results).toHaveLength(4);
      expect(results[0].gate.type).toBe('has_tests');
      expect(results[0].passed).toBe(true);
      expect(results[1].gate.type).toBe('has_docs');
      expect(results[1].passed).toBe(true);
      expect(results[2].gate.type).toBe('has_artifacts');
      expect(results[2].passed).toBe(true);
      expect(results[3].gate.type).toBe('acceptance_met');
      expect(results[3].passed).toBe(true);
    });
  });
});

