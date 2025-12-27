/**
 * Status service - provides a unified view of project state
 * 
 * Implements pm.status functionality for quick overview
 */

import type { Project, AgentTask, WorkItem, Gate } from '@projectflow/db';
import { getProject } from './projects';
import { listDecisions } from './decisions';
import { listAgentTasks } from './agentTasks';
import { listWorkItems } from './workItems';
import { getGateStatus } from './gates';
import { listConstraints } from './constraints';
import type { Decision, Constraint } from '@projectflow/db';
import type { GateStatusSummary } from './gatesTypes';
import type { Database } from '@projectflow/db';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Project status result
 */
export interface ProjectStatus {
  project: Project;
  activeTask: AgentTask | null;
  activeWorkItem: WorkItem | null;
  recentDecisions: Decision[];
  gateStatus: GateStatusSummary[];
  activeConstraints: Constraint[];
  nextSuggestedAction: string;
  summary: {
    totalTasks: number;
    tasksReady: number;
    tasksDoing: number;
    tasksBlocked: number;
    tasksDone: number;
    workItemsOpen: number;
    workItemsInProgress: number;
    workItemsDone: number;
    requiredGatesPassing: number;
    requiredGatesTotal: number;
  };
}

/**
 * Gets comprehensive project status
 * 
 * @param client Authenticated Supabase client
 * @param userId User ID
 * @param projectId Project ID
 * @returns Complete project status
 */
export async function getProjectStatus(
  client: SupabaseClient<Database>,
  userId: string,
  projectId: string
): Promise<ProjectStatus> {
  // Fetch project details
  // Pass userId to skip getUser() check for OAuth clients
  const project = await getProject(client, projectId, userId);

  // Fetch recent decisions (last 5)
  const allDecisions = await listDecisions(userId, projectId);
  const recentDecisions = allDecisions.slice(0, 5);

  // Fetch all tasks
  // Pass userId to skip getUser() check for OAuth clients
  const allTasks = await listAgentTasks(client, projectId, {}, userId);
  
  // Find active task (status = 'doing')
  const activeTask = allTasks.find(t => t.status === 'doing') || null;

  // Fetch all work items
  // Pass userId to skip getUser() check for OAuth clients
  const allWorkItems = await listWorkItems(client, projectId, undefined, userId);
  
  // Find active work item (status = 'in_progress')
  const activeWorkItem = allWorkItems.find(w => w.status === 'in_progress') || null;

  // Get gate status
  const gateStatus = await getGateStatus(userId, projectId, undefined, client);

  // Get active constraints
  const activeConstraints = await listConstraints(userId, projectId);

  // Calculate summary stats
  const tasksReady = allTasks.filter(t => t.status === 'ready').length;
  const tasksDoing = allTasks.filter(t => t.status === 'doing').length;
  const tasksBlocked = allTasks.filter(t => t.status === 'blocked').length;
  const tasksDone = allTasks.filter(t => t.status === 'done').length;

  const workItemsOpen = allWorkItems.filter(w => w.status === 'open').length;
  const workItemsInProgress = allWorkItems.filter(w => w.status === 'in_progress').length;
  const workItemsDone = allWorkItems.filter(w => w.status === 'done').length;

  const requiredGates = gateStatus.filter(g => g.is_required);
  const requiredGatesTotal = requiredGates.length;
  const requiredGatesPassing = requiredGates.filter(g => 
    g.latest_run?.status === 'passing'
  ).length;

  // Suggest next action
  let nextSuggestedAction = '';
  if (activeTask) {
    nextSuggestedAction = `Continue working on task: ${activeTask.title}`;
  } else if (tasksReady > 0) {
    nextSuggestedAction = `Pick a task to start (${tasksReady} ready tasks available)`;
  } else if (tasksBlocked > 0) {
    nextSuggestedAction = `Resolve ${tasksBlocked} blocked task(s)`;
  } else if (activeWorkItem) {
    nextSuggestedAction = `Create tasks for work item: ${activeWorkItem.title}`;
  } else if (requiredGatesTotal > 0 && requiredGatesPassing < requiredGatesTotal) {
    const failingCount = requiredGatesTotal - requiredGatesPassing;
    nextSuggestedAction = `Fix ${failingCount} failing required gate(s)`;
  } else {
    nextSuggestedAction = 'Create a new work item or task';
  }

  return {
    project,
    activeTask,
    activeWorkItem,
    recentDecisions,
    gateStatus,
    activeConstraints,
    nextSuggestedAction,
    summary: {
      totalTasks: allTasks.length,
      tasksReady,
      tasksDoing,
      tasksBlocked,
      tasksDone,
      workItemsOpen,
      workItemsInProgress,
      workItemsDone,
      requiredGatesPassing,
      requiredGatesTotal,
    },
  };
}

