/**
 * Event handlers - side effects triggered by events
 * 
 * This module handles side effects when events are emitted.
 * Examples: updating read models, sending notifications, triggering workflows.
 * 
 * Note: Event handlers should be idempotent and handle failures gracefully.
 */

import type { Event } from '@projectflow/db';
import type { EventType } from '../types';
import type { BaseEvent } from './eventTypes';
import { createServerClient } from '@projectflow/db';
import { mapSupabaseError } from '../errors';

/**
 * Event handler function type
 */
export type EventHandler = (event: Event) => Promise<void>;

/**
 * Registry of event handlers by event type
 */
const eventHandlers: Map<EventType, EventHandler[]> = new Map();

/**
 * Registers an event handler for a specific event type
 * 
 * @param eventType - Event type to handle
 * @param handler - Handler function
 */
export function registerEventHandler(eventType: EventType, handler: EventHandler): void {
  if (!eventHandlers.has(eventType)) {
    eventHandlers.set(eventType, []);
  }
  eventHandlers.get(eventType)!.push(handler);
}

/**
 * Processes an event by calling all registered handlers
 * 
 * @param event - Event to process
 */
export async function processEvent(event: Event): Promise<void> {
  const handlers = eventHandlers.get(event.event_type as EventType) || [];
  
  // Execute all handlers in parallel
  await Promise.all(
    handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        // Log error but don't fail the event processing
        console.error(`Error in event handler for ${event.event_type}:`, error);
        // In production, you might want to send this to an error tracking service
      }
    })
  );
}

/**
 * Default handler: Updates read models based on events
 * This ensures the database stays in sync with the event log
 */
async function updateReadModels(event: Event): Promise<void> {
  const supabase = createServerClient();

  switch (event.event_type as EventType) {
    case 'ProjectCreated': {
      // Project is already created by the service, no additional update needed
      break;
    }

    case 'TaskCreated': {
      // Task is already created by the service, no additional update needed
      break;
    }

    case 'TaskStarted': {
      // Update task status and lock information
      const payload = event.payload as any;
      if (payload.task_id) {
        await (supabase as any)
          .from('tasks')
          .update({
            status: 'in_progress',
            locked_at: payload.locked_at || new Date().toISOString(),
            locked_by: payload.locked_by || null,
          })
          .eq('id', payload.task_id);
      }
      break;
    }

    case 'TaskBlocked': {
      // Update task status to blocked
      const payload = event.payload as any;
      if (payload.task_id) {
        await (supabase as any)
          .from('tasks')
          .update({
            status: 'blocked',
          })
          .eq('id', payload.task_id);
      }
      break;
    }

    case 'TaskCompleted': {
      // Update task status to done and release lock
      const payload = event.payload as any;
      if (payload.task_id) {
        await (supabase as any)
          .from('tasks')
          .update({
            status: 'done',
            locked_at: null,
            locked_by: null,
          })
          .eq('id', payload.task_id);
      }
      break;
    }

    case 'TaskCancelled': {
      // Update task status to cancelled and release lock
      const payload = event.payload as any;
      if (payload.task_id) {
        await (supabase as any)
          .from('tasks')
          .update({
            status: 'cancelled',
            locked_at: null,
            locked_by: null,
          })
          .eq('id', payload.task_id);
      }
      break;
    }

    case 'ArtifactProduced': {
      // Artifact is already created by the service, no additional update needed
      break;
    }

    case 'GateEvaluated': {
      // Gate evaluation is informational, no read model update needed
      break;
    }

    case 'CheckpointCreated': {
      // Checkpoint is already created by the service, no additional update needed
      break;
    }

    case 'DecisionRecorded': {
      // Decision is already created by the service, no additional update needed
      break;
    }

    case 'ScopeAsserted': {
      // Scope assertion is informational, no read model update needed
      break;
    }

    default:
      // Unknown event type, ignore
      break;
  }
}

/**
 * Initialize default event handlers
 */
export function initializeEventHandlers(): void {
  // Register the default read model updater
  registerEventHandler('ProjectCreated', updateReadModels);
  registerEventHandler('TaskCreated', updateReadModels);
  registerEventHandler('TaskStarted', updateReadModels);
  registerEventHandler('TaskBlocked', updateReadModels);
  registerEventHandler('TaskCompleted', updateReadModels);
  registerEventHandler('TaskCancelled', updateReadModels);
  registerEventHandler('ArtifactProduced', updateReadModels);
  registerEventHandler('GateEvaluated', updateReadModels);
  registerEventHandler('CheckpointCreated', updateReadModels);
  registerEventHandler('DecisionRecorded', updateReadModels);
  registerEventHandler('ScopeAsserted', updateReadModels);
}

/**
 * Helper to emit an event and process its handlers
 * This is the recommended way to emit events in services
 * 
 * @param eventData - Event data to append
 * @returns The created event
 */
export async function emitEvent(eventData: {
  project_id: string;
  task_id?: string | null;
  user_id: string;
  event_type: EventType;
  payload: Record<string, any>;
}): Promise<Event> {
  const { appendEvent } = await import('./eventStore');
  const event = await appendEvent({
    project_id: eventData.project_id,
    task_id: eventData.task_id || null,
    user_id: eventData.user_id,
    event_type: eventData.event_type,
    payload: eventData.payload || {},
  });
  
  // Process event handlers asynchronously (don't wait)
  processEvent(event).catch((error) => {
    console.error('Error processing event handlers:', error);
  });
  
  return event;
}

