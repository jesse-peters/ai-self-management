/**
 * Tests for event store operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  appendEvent,
  getProjectEvents,
  getTaskEvents,
  getEventsSince,
  getEventsByType,
  getEvent,
} from '../eventStore';
import type { EventInsert, Event } from '@projectflow/db';
import type { EventType } from '../../types';

// Mock database client
vi.mock('@projectflow/db', () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from '@projectflow/db';

describe('eventStore', () => {
  const mockUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const mockProjectId = '650e8400-e29b-41d4-a716-446655440001';
  const mockTaskId = '550e8400-e29b-41d4-a716-446655440000';
  const mockEventId = '750e8400-e29b-41d4-a716-446655440002';

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
  });

  describe('appendEvent', () => {
    it('should append an event successfully', async () => {
      const eventInsert: EventInsert = {
        project_id: mockProjectId,
        user_id: mockUserId,
        task_id: mockTaskId,
        event_type: 'TaskCreated',
        payload: { title: 'Test Task' },
      };

      const mockEvent: Event = {
        id: mockEventId,
        ...eventInsert,
        created_at: new Date().toISOString(),
      };

      mockSupabase.single.mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      const result = await appendEvent(eventInsert);

      expect(result).toEqual(mockEvent);
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          project_id: mockProjectId,
          task_id: mockTaskId,
          user_id: mockUserId,
          event_type: 'TaskCreated',
          payload: { title: 'Test Task' },
        },
      ]);
    });

    it('should handle null task_id', async () => {
      const eventInsert: EventInsert = {
        project_id: mockProjectId,
        user_id: mockUserId,
        event_type: 'ProjectCreated',
        payload: { name: 'Test Project' },
      };

      const mockEvent: Event = {
        id: mockEventId,
        ...eventInsert,
        task_id: null,
        created_at: new Date().toISOString(),
      };

      mockSupabase.single.mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      const result = await appendEvent(eventInsert);

      expect(result).toEqual(mockEvent);
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          task_id: null,
        }),
      ]);
    });

    it('should throw error for missing required fields', async () => {
      const invalidEvent = {
        project_id: mockProjectId,
        // Missing user_id and event_type
      } as any;

      await expect(appendEvent(invalidEvent)).rejects.toThrow();
    });
  });

  describe('getProjectEvents', () => {
    it('should retrieve events for a project', async () => {
      const mockEvents: Event[] = [
        {
          id: mockEventId,
          project_id: mockProjectId,
          user_id: mockUserId,
          task_id: null,
          event_type: 'ProjectCreated',
          payload: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.limit.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const result = await getProjectEvents(mockProjectId);

      expect(result).toEqual(mockEvents);
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', mockProjectId);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should respect limit parameter', async () => {
      const mockEvents: Event[] = [];

      mockSupabase.limit.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      await getProjectEvents(mockProjectId, 10);

      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
    });

    it('should not apply limit when not provided', async () => {
      const mockEvents: Event[] = [];

      mockSupabase.order.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      await getProjectEvents(mockProjectId);

      expect(mockSupabase.limit).not.toHaveBeenCalled();
    });
  });

  describe('getTaskEvents', () => {
    it('should retrieve events for a task', async () => {
      const mockEvents: Event[] = [
        {
          id: mockEventId,
          project_id: mockProjectId,
          user_id: mockUserId,
          task_id: mockTaskId,
          event_type: 'TaskStarted',
          payload: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.limit.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const result = await getTaskEvents(mockTaskId);

      expect(result).toEqual(mockEvents);
      expect(mockSupabase.eq).toHaveBeenCalledWith('task_id', mockTaskId);
    });
  });

  describe('getEventsSince', () => {
    it('should retrieve events after a timestamp', async () => {
      const since = new Date('2024-01-01T00:00:00Z').toISOString();
      const mockEvents: Event[] = [];

      mockSupabase.limit.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      await getEventsSince(mockProjectId, since);

      expect(mockSupabase.gt).toHaveBeenCalledWith('created_at', since);
    });
  });

  describe('getEventsByType', () => {
    it('should retrieve events filtered by type', async () => {
      const eventType: EventType = 'TaskCompleted';
      const mockEvents: Event[] = [];

      mockSupabase.limit.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      await getEventsByType(mockProjectId, eventType);

      expect(mockSupabase.eq).toHaveBeenCalledWith('event_type', eventType);
    });
  });

  describe('getEvent', () => {
    it('should retrieve a single event by ID', async () => {
      const mockEvent: Event = {
        id: mockEventId,
        project_id: mockProjectId,
        user_id: mockUserId,
        task_id: mockTaskId,
        event_type: 'TaskCreated',
        payload: {},
        created_at: new Date().toISOString(),
      };

      mockSupabase.single.mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      const result = await getEvent(mockEventId);

      expect(result).toEqual(mockEvent);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockEventId);
    });

    it('should return null when event not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error code
      });

      const result = await getEvent(mockEventId);

      expect(result).toBeNull();
    });
  });
});

