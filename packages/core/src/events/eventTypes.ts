/**
 * Event type definitions for the event sourcing system
 * 
 * Events are the source of truth for all state changes in the system.
 * All mutations should emit events that can be used to reconstruct state.
 */

import type { EventType } from '../types';

/**
 * Base event interface that all events must conform to
 */
export interface BaseEvent {
  id: string;
  project_id: string;
  task_id?: string | null;
  user_id: string;
  event_type: EventType;
  payload: Record<string, any>;
  created_at: string;
}

/**
 * Event payload types for each event type
 */

export interface ProjectCreatedPayload {
  project_id: string;
  name: string;
  description?: string | null;
  rules?: Record<string, any>;
}

export interface TaskCreatedPayload {
  task_id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  acceptance_criteria?: string[];
  constraints?: Record<string, any>;
  dependencies?: string[];
}

export interface TaskStartedPayload {
  task_id: string;
  locked_at: string;
  locked_by?: string | null;
}

export interface TaskBlockedPayload {
  task_id: string;
  reason: string;
  needs_human: boolean;
}

export interface TaskCompletedPayload {
  task_id: string;
  artifacts?: string[]; // Array of artifact IDs
}

export interface TaskCancelledPayload {
  task_id: string;
  reason?: string;
}

export interface ArtifactProducedPayload {
  artifact_id: string;
  task_id: string;
  type: string;
  ref: string;
  summary?: string | null;
}

export interface GateEvaluatedPayload {
  task_id: string;
  gates: Array<{
    type: string;
    passed: boolean;
    reason?: string;
    missingRequirements?: string[];
  }>;
}

export interface CheckpointCreatedPayload {
  checkpoint_id: string;
  label: string;
  repo_ref?: string | null;
  summary: string;
  resume_instructions?: string | null;
}

export interface DecisionRecordedPayload {
  decision_id: string;
  title: string;
  options: any[];
  choice: string;
  rationale: string;
}

export interface OutcomeRecordedPayload {
  outcome_id: string;
  subject_type: string;
  subject_id: string;
  result: string;
  created_by: string;
}

export interface ConstraintCreatedPayload {
  constraint_id: string;
  scope: string;
  trigger: string;
  rule_text: string;
  enforcement_level: string;
}

export interface ConstraintDeletedPayload {
  constraint_id: string;
}

export interface ScopeAssertedPayload {
  task_id: string;
  changeset: {
    filesChanged: string[];
    filesAdded: string[];
    filesDeleted: string[];
  };
  allowed: boolean;
  reason?: string;
  violations?: string[];
}

/**
 * Type-safe event factory functions
 */
export type EventPayloadMap = {
  ProjectCreated: ProjectCreatedPayload;
  TaskCreated: TaskCreatedPayload;
  TaskStarted: TaskStartedPayload;
  TaskBlocked: TaskBlockedPayload;
  TaskCompleted: TaskCompletedPayload;
  TaskCancelled: TaskCancelledPayload;
  ArtifactProduced: ArtifactProducedPayload;
  GateEvaluated: GateEvaluatedPayload;
  CheckpointCreated: CheckpointCreatedPayload;
  DecisionRecorded: DecisionRecordedPayload;
  OutcomeRecorded: OutcomeRecordedPayload;
  ConstraintCreated: ConstraintCreatedPayload;
  ConstraintDeleted: ConstraintDeletedPayload;
  ScopeAsserted: ScopeAssertedPayload;
};

/**
 * Type-safe event creation helper
 */
export type TypedEvent<T extends EventType> = BaseEvent & {
  event_type: T;
  payload: EventPayloadMap[T];
};

