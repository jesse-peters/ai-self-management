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
 * MVP Event Payloads
 */

export interface WorkItemCreatedPayload {
  work_item_id: string;
  title: string;
  description?: string | null;
  external_url?: string | null;
  status: string;
}

export interface WorkItemStatusChangedPayload {
  work_item_id: string;
  old_status: string;
  new_status: string;
}

export interface AgentTaskCreatedPayload {
  task_id: string;
  work_item_id?: string | null;
  type: string;
  title: string;
  goal: string;
  status: string;
  depends_on_ids?: string[];
}

export interface AgentTaskStartedPayload {
  task_id: string;
  old_status: string;
  new_status: string;
  locked_at: string;
}

export interface AgentTaskBlockedPayload {
  task_id: string;
  old_status: string;
  new_status: string;
  reason: string;
}

export interface AgentTaskCompletedPayload {
  task_id: string;
  old_status: string;
  new_status: string;
}

export interface EvidenceAddedPayload {
  evidence_id?: string;
  task_id?: string | null;
  work_item_id?: string | null;
  type: string;
  content: string;
  created_by: string;
}

export interface GateConfiguredPayload {
  gate_id: string;
  name: string;
  is_required: boolean;
  runner_mode: string;
}

export interface GateExecutedPayload {
  gate_run_id: string;
  gate_id: string;
  work_item_id?: string | null;
  task_id?: string | null;
  status: string;
  exit_code?: number | null;
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
  WorkItemCreated: WorkItemCreatedPayload;
  WorkItemStatusChanged: WorkItemStatusChangedPayload;
  AgentTaskCreated: AgentTaskCreatedPayload;
  AgentTaskStarted: AgentTaskStartedPayload;
  AgentTaskBlocked: AgentTaskBlockedPayload;
  AgentTaskCompleted: AgentTaskCompletedPayload;
  EvidenceAdded: EvidenceAddedPayload;
  GateConfigured: GateConfiguredPayload;
  GateExecuted: GateExecutedPayload;
};

/**
 * Type-safe event creation helper
 */
export type TypedEvent<T extends EventType> = BaseEvent & {
  event_type: T;
  payload: EventPayloadMap[T];
};

