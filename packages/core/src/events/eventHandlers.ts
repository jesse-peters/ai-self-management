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

// Lazy load Sentry to avoid initialization issues if DSN is not set
// Only works in Node.js environment (server-side)
let Sentry: any = null;

function getSentry(): any {
  // Skip Sentry in browser environments (client-side)
  // Check for browser globals that don't exist in Node.js
  if (typeof process === 'undefined' || (globalThis as any).window !== undefined) {
    return null;
  }

  if (Sentry !== null) {
    return Sentry;
  }

  // Only try to load Sentry if DSN is available and we're in Node.js
  // Use extremely dynamic require to prevent Turbopack/webpack static analysis
  if (process.env.SENTRY_DSN && typeof require !== 'undefined') {
    try {
      // Use Function constructor to make require truly dynamic and prevent static analysis
      const requireFunc = new Function('moduleName', 'return require(moduleName)');
      Sentry = requireFunc('@sentry/node');
      return Sentry;
    } catch {
      // Sentry not available, return null
      return null;
    }
  }

  return null;
}

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

        // Capture error to Sentry if available
        const sentry = getSentry();
        if (sentry && error instanceof Error) {
          sentry.captureException(error, {
            level: 'error',
            tags: {
              component: 'event-handler',
              event_type: event.event_type,
            },
            extra: {
              eventId: event.id,
              projectId: event.project_id,
              taskId: event.task_id,
              userId: event.user_id,
              eventPayload: event.payload,
            },
          });
        }
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
 * @param client - Optional authenticated Supabase client (required for RLS to work)
 * @returns The created event
 */
export async function emitEvent(
  eventData: {
    project_id: string;
    task_id?: string | null;
    user_id: string;
    event_type: EventType;
    payload: Record<string, any>;
  },
  client?: any
): Promise<Event> {
  const { appendEvent } = await import('./eventStore');
  const event = await appendEvent(
    {
      project_id: eventData.project_id,
      task_id: eventData.task_id || null,
      user_id: eventData.user_id,
      event_type: eventData.event_type,
      payload: eventData.payload || {},
    },
    client
  );

  // Process event handlers asynchronously (don't wait)
  processEvent(event).catch((error) => {
    console.error('Error processing event handlers:', error);
  });

  return event;
}

