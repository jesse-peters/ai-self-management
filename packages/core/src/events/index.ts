/**
 * Event sourcing module
 * 
 * This module provides the event sourcing infrastructure:
 * - Event type definitions
 * - Event store for persistence
 * - Event handlers for side effects
 */

// Export event types
export type {
  BaseEvent,
  ProjectCreatedPayload,
  TaskCreatedPayload,
  TaskStartedPayload,
  TaskBlockedPayload,
  TaskCompletedPayload,
  TaskCancelledPayload,
  ArtifactProducedPayload,
  GateEvaluatedPayload,
  CheckpointCreatedPayload,
  DecisionRecordedPayload,
  OutcomeRecordedPayload,
  ConstraintCreatedPayload,
  ConstraintDeletedPayload,
  ScopeAssertedPayload,
  WorkItemCreatedPayload,
  WorkItemStatusChangedPayload,
  AgentTaskCreatedPayload,
  AgentTaskStartedPayload,
  AgentTaskBlockedPayload,
  AgentTaskCompletedPayload,
  AgentTaskFilesTouchedPayload,
  EvidenceAddedPayload,
  GateConfiguredPayload,
  GateExecutedPayload,
  EventPayloadMap,
  TypedEvent,
} from './eventTypes';

// Export event store functions
export {
  appendEvent,
  getProjectEvents,
  getTaskEvents,
  getEventsSince,
  getEventsByType,
  getEvent,
} from './eventStore';

// Export event handlers
export {
  registerEventHandler,
  processEvent,
  initializeEventHandlers,
  emitEvent,
  type EventHandler,
} from './eventHandlers';

