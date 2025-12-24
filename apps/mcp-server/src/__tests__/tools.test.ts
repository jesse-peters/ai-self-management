/**
 * Integration tests for MCP tool implementations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  implementCreateProject,
  implementListProjects,
  implementCreateTask,
  implementListTasks,
  implementUpdateTask,
  implementGetContext,
  implementPickNextTask,
  implementStartTask,
  implementBlockTask,
  implementAppendArtifact,
  implementEvaluateGates,
  implementCompleteTask,
  implementCreateCheckpoint,
  implementRecordDecision,
  implementAssertInScope,
} from '../toolImplementations';

// Mock supabase client
vi.mock('@projectflow/db', () => ({
  createServiceRoleClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          },
        },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })),
    })),
  })),
}));

// Mock core services
vi.mock('@projectflow/core', () => ({
  createProject: vi.fn(),
  listProjects: vi.fn(),
  createTask: vi.fn(),
  listTasks: vi.fn(),
  updateTask: vi.fn(),
  getProjectContext: vi.fn(),
  pickNextTask: vi.fn(),
  startTask: vi.fn(),
  blockTask: vi.fn(),
  appendArtifact: vi.fn(),
  evaluateGates: vi.fn(),
  completeTask: vi.fn(),
  createCheckpoint: vi.fn(),
  recordDecision: vi.fn(),
  assertInScope: vi.fn(),
  verifyAccessToken: vi.fn(),
}));

import {
  createProject,
  listProjects,
  createTask,
  listTasks,
  updateTask,
  getProjectContext,
  pickNextTask,
  startTask,
  blockTask,
  appendArtifact,
  evaluateGates,
  completeTask,
  createCheckpoint,
  recordDecision,
  assertInScope,
} from '@projectflow/core';

describe('MCP Tool Implementations', () => {
  const mockProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const mockTaskId = '650e8400-e29b-41d4-a716-446655440001';
  const mockToken = 'supabase-jwt-token-for-testing';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pm.create_project', () => {
    it('should create a project with name and description', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        description: 'Test Description',
      };

      vi.mocked(createProject).mockResolvedValue(mockProject as any);

      const result = await implementCreateProject(mockToken, {
        name: 'Test Project',
        description: 'Test Description',
      });

      expect(result).toEqual(mockProject);
    });

    it('should create a project with rules', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        rules: { allowedPaths: ['src/'] },
      };

      vi.mocked(createProject).mockResolvedValue(mockProject as any);

      const result = await implementCreateProject(mockToken, {
        name: 'Test Project',
        rules: { allowedPaths: ['src/'] },
      });

      expect(result).toEqual(mockProject);
    });
  });

  describe('pm.list_projects', () => {
    it('should list all projects', async () => {
      const mockProjects = [
        { id: mockProjectId, name: 'Project 1' },
        { id: '750e8400-e29b-41d4-a716-446655440002', name: 'Project 2' },
      ];

      vi.mocked(listProjects).mockResolvedValue(mockProjects as any);

      const result = await implementListProjects(mockToken);

      expect(result).toEqual(mockProjects);
    });
  });

  describe('pm.create_task', () => {
    it('should create a task with basic fields', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Test Task',
        status: 'todo',
      };

      vi.mocked(createTask).mockResolvedValue(mockTask as any);

      const result = await implementCreateTask(mockToken, {
        projectId: mockProjectId,
        title: 'Test Task',
      });

      expect(result).toEqual(mockTask);
    });

    it('should create a task with acceptance criteria and constraints', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Test Task',
        acceptance_criteria: ['Criterion 1'],
        constraints: { allowedPaths: ['src/'] },
      };

      vi.mocked(createTask).mockResolvedValue(mockTask as any);

      const result = await implementCreateTask(mockToken, {
        projectId: mockProjectId,
        title: 'Test Task',
        acceptanceCriteria: ['Criterion 1'],
        constraints: { allowedPaths: ['src/'] },
        dependencies: [],
      });

      expect(result).toEqual(mockTask);
    });
  });

  describe('pm.list_tasks', () => {
    it('should list tasks with filters', async () => {
      const mockTasks = [
        { id: mockTaskId, title: 'Task 1', status: 'in_progress' },
      ];

      vi.mocked(listTasks).mockResolvedValue(mockTasks as any);

      const result = await implementListTasks(mockToken, {
        projectId: mockProjectId,
        status: 'in_progress',
        priority: 'high',
      });

      expect(result).toEqual(mockTasks);
    });
  });

  describe('pm.update_task', () => {
    it('should update task fields', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Updated Task',
        status: 'done',
      };

      vi.mocked(updateTask).mockResolvedValue(mockTask as any);

      const result = await implementUpdateTask(mockToken, {
        taskId: mockTaskId,
        title: 'Updated Task',
        status: 'done',
      });

      expect(result).toEqual(mockTask);
    });
  });

  describe('pm.get_context', () => {
    it('should get project context', async () => {
      const mockContext = {
        project: { id: mockProjectId, name: 'Test Project' },
        tasks: [],
        latestSession: null,
      };

      vi.mocked(getProjectContext).mockResolvedValue(mockContext as any);

      const result = await implementGetContext(mockToken, {
        projectId: mockProjectId,
      });

      expect(result).toEqual(mockContext);
    });
  });

  describe('pm.pick_next_task', () => {
    it('should pick next task with default strategy', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Next Task',
        status: 'todo',
      };

      vi.mocked(pickNextTask).mockResolvedValue(mockTask as any);

      const result = await implementPickNextTask(mockToken, {
        projectId: mockProjectId,
      });

      expect(result).toEqual(mockTask);
    });

    it('should pick next task with custom strategy', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Next Task',
        status: 'todo',
      };

      vi.mocked(pickNextTask).mockResolvedValue(mockTask as any);

      const result = await implementPickNextTask(mockToken, {
        projectId: mockProjectId,
        strategy: 'priority',
        lockedBy: 'agent-123',
      });

      expect(result).toEqual(mockTask);
    });
  });

  describe('pm.start_task', () => {
    it('should start a task', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Task',
        status: 'in_progress',
      };

      vi.mocked(startTask).mockResolvedValue(mockTask as any);

      const result = await implementStartTask(mockToken, {
        taskId: mockTaskId,
      });

      expect(result).toEqual(mockTask);
    });
  });

  describe('pm.block_task', () => {
    it('should block a task', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Task',
        status: 'blocked',
      };

      vi.mocked(blockTask).mockResolvedValue(mockTask as any);

      const result = await implementBlockTask(mockToken, {
        taskId: mockTaskId,
        reason: 'Waiting for approval',
        needsHuman: true,
      });

      expect(result).toEqual(mockTask);
    });
  });

  describe('pm.append_artifact', () => {
    it('should append an artifact', async () => {
      const mockArtifact = {
        id: '750e8400-e29b-41d4-a716-446655440002',
        type: 'diff',
        ref: 'changes.diff',
      };

      vi.mocked(appendArtifact).mockResolvedValue(mockArtifact as any);

      const result = await implementAppendArtifact(mockToken, {
        taskId: mockTaskId,
        type: 'diff',
        ref: 'changes.diff',
        summary: 'Code changes',
      });

      expect(result).toEqual(mockArtifact);
    });
  });

  describe('pm.evaluate_gates', () => {
    it('should evaluate gates for a task', async () => {
      const mockGateResults = [
        {
          passed: true,
          gate: { type: 'has_tests' },
          reason: 'Found test artifacts',
        },
      ];

      vi.mocked(evaluateGates).mockResolvedValue(mockGateResults as any);

      const result = await implementEvaluateGates(mockToken, {
        taskId: mockTaskId,
      });

      expect(result).toEqual(mockGateResults);
    });
  });

  describe('pm.complete_task', () => {
    it('should complete a task', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Task',
        status: 'done',
      };

      vi.mocked(completeTask).mockResolvedValue(mockTask as any);

      const result = await implementCompleteTask(mockToken, {
        taskId: mockTaskId,
        artifactIds: ['artifact-1', 'artifact-2'],
      });

      expect(result).toEqual(mockTask);
    });
  });

  describe('pm.create_checkpoint', () => {
    it('should create a checkpoint', async () => {
      const mockCheckpoint = {
        id: '750e8400-e29b-41d4-a716-446655440002',
        label: 'Milestone 1',
        summary: 'Completed initial features',
      };

      vi.mocked(createCheckpoint).mockResolvedValue(mockCheckpoint as any);

      const result = await implementCreateCheckpoint(mockToken, {
        projectId: mockProjectId,
        label: 'Milestone 1',
        repoRef: 'main',
        summary: 'Completed initial features',
        resumeInstructions: 'Continue with next phase',
      });

      expect(result).toEqual(mockCheckpoint);
    });
  });

  describe('pm.record_decision', () => {
    it('should record a decision', async () => {
      const mockDecision = {
        id: '750e8400-e29b-41d4-a716-446655440002',
        title: 'Architecture Choice',
        choice: 'Option A',
      };

      vi.mocked(recordDecision).mockResolvedValue(mockDecision as any);

      const result = await implementRecordDecision(mockToken, {
        projectId: mockProjectId,
        title: 'Architecture Choice',
        options: ['Option A', 'Option B'],
        choice: 'Option A',
        rationale: 'Better performance',
      });

      expect(result).toEqual(mockDecision);
    });
  });

  describe('pm.assert_in_scope', () => {
    it('should assert changeset is in scope', async () => {
      const mockScopeResult = {
        allowed: true,
        reason: 'All changes are within the allowed scope',
      };

      vi.mocked(assertInScope).mockResolvedValue(mockScopeResult as any);

      const result = await implementAssertInScope(mockToken, {
        taskId: mockTaskId,
        changesetManifest: {
          filesChanged: ['src/index.ts'],
          filesAdded: [],
          filesDeleted: [],
        },
      });

      expect(result).toEqual(mockScopeResult);
    });
  });
});
