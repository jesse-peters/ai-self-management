/**
 * Event store - handles persistence and retrieval of events
 * 
 * Events are the source of truth. All state changes should be recorded as events.
 */

import { createServerClient } from '@projectflow/db';
import type { Event, EventInsert } from '@projectflow/db';
import type { BaseEvent } from './eventTypes';
import type { EventType } from '../types';
import { mapSupabaseError } from '../errors';
import { validateUUID } from '../validation';

/**
 * Appends an event to the event log
 * 
 * @param event - Event data to append (without id and created_at, which are auto-generated)
 * @returns The created event with id and created_at
 */
export async function appendEvent(event: EventInsert): Promise<Event> {
  try {
    if (!event.project_id) {
      throw new Error('project_id is required for events');
    }
    if (!event.user_id) {
      throw new Error('user_id is required for events');
    }
    if (!event.event_type) {
      throw new Error('event_type is required for events');
    }

    validateUUID(event.project_id, 'project_id');
    validateUUID(event.user_id, 'user_id');
    if (event.task_id) {
      validateUUID(event.task_id, 'task_id');
    }

    const supabase = createServerClient();

    const { data: createdEvent, error } = await (supabase as any)
      .from('events')
      .insert([
        {
          project_id: event.project_id,
          task_id: event.task_id || null,
          user_id: event.user_id,
          event_type: event.event_type,
          payload: event.payload || {},
        },
      ])
      .select()
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!createdEvent) {
      throw new Error('Failed to create event');
    }

    return createdEvent as Event;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets all events for a project, ordered by creation time (newest first)
 * 
 * @param projectId - Project ID to get events for
 * @param limit - Optional limit on number of events to return
 * @returns Array of events
 */
export async function getProjectEvents(
  projectId: string,
  limit?: number
): Promise<Event[]> {
  try {
    validateUUID(projectId, 'projectId');

    const supabase = createServerClient();

    let query = (supabase as any)
      .from('events')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data: events, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (events || []) as Event[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets all events for a specific task, ordered by creation time (newest first)
 * 
 * @param taskId - Task ID to get events for
 * @param limit - Optional limit on number of events to return
 * @returns Array of events
 */
export async function getTaskEvents(taskId: string, limit?: number): Promise<Event[]> {
  try {
    validateUUID(taskId, 'taskId');

    const supabase = createServerClient();

    let query = (supabase as any)
      .from('events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data: events, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (events || []) as Event[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets events created after a specific timestamp
 * Useful for event streaming or incremental updates
 * 
 * @param projectId - Project ID to get events for
 * @param since - Timestamp to get events after (ISO string)
 * @param limit - Optional limit on number of events to return
 * @returns Array of events
 */
export async function getEventsSince(
  projectId: string,
  since: string,
  limit?: number
): Promise<Event[]> {
  try {
    validateUUID(projectId, 'projectId');

    const supabase = createServerClient();

    let query = (supabase as any)
      .from('events')
      .select('*')
      .eq('project_id', projectId)
      .gt('created_at', since)
      .order('created_at', { ascending: false });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data: events, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (events || []) as Event[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets events filtered by event type
 * 
 * @param projectId - Project ID to get events for
 * @param eventType - Event type to filter by
 * @param limit - Optional limit on number of events to return
 * @returns Array of events
 */
export async function getEventsByType(
  projectId: string,
  eventType: EventType,
  limit?: number
): Promise<Event[]> {
  try {
    validateUUID(projectId, 'projectId');

    const supabase = createServerClient();

    let query = (supabase as any)
      .from('events')
      .select('*')
      .eq('project_id', projectId)
      .eq('event_type', eventType)
      .order('created_at', { ascending: false });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data: events, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return (events || []) as Event[];
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets a single event by ID
 * 
 * @param eventId - Event ID
 * @returns Event or null if not found
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  try {
    validateUUID(eventId, 'eventId');

    const supabase = createServerClient();

    const { data: event, error } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      // If not found, return null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }
      throw mapSupabaseError(error);
    }

    return event as Event | null;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

