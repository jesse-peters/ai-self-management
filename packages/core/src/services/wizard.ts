/**
 * Wizard service - handles structured project kickoff
 * 
 * Provides a multi-step wizard flow that guides users through:
 * 1. Basic project information
 * 2. Goals and definition of done
 * 3. Risk areas and constraints
 * 4. Gate configuration
 * 5. Final review and project creation
 * 
 * IMPORTANT: This service uses RLS for security.
 */

import type { Database, ProjectSpec } from '@projectflow/db';
import { NotFoundError, ValidationError, mapSupabaseError } from '../errors';
import { createProject } from './projects';
import { createTask } from './tasks';
import { createCheckpoint } from './checkpoints';
import { emitEvent } from '../events';

// SupabaseClient type from @supabase/supabase-js
type SupabaseClient<T = any> = any;

/**
 * Wizard session state
 * Stored in memory during wizard flow, then finalized to create project + spec
 */
export interface WizardSession {
  id: string;
  step: number;
  data: {
    // Step 1: Basics
    name?: string;
    description?: string;
    repo_url?: string;
    main_branch?: string;
    language?: string;
    framework?: string;
    
    // Step 2: Goals & DoD
    goals?: string;
    definition_of_done?: string;
    deliverables?: Array<{
      name: string;
      description: string;
      acceptance_criteria?: string[];
    }>;
    
    // Step 3: Risks & Constraints
    risk_areas?: string[];
    do_not_touch?: string[];
    preferences?: {
      coding_style?: string;
      testing_approach?: string;
      documentation?: string;
      [key: string]: any;
    };
    
    // Step 4: Gates
    gate_pack_id?: string;
    custom_gates?: Array<{
      type: string;
      config?: Record<string, any>;
    }>;
    
    // Metadata
    created_at: string;
  };
}

// In-memory storage for wizard sessions
// In production, this could be stored in Redis or a database
const wizardSessions = new Map<string, WizardSession>();

/**
 * Starts a new wizard session
 * 
 * @param client Authenticated Supabase client
 * @returns Wizard session ID
 */
export async function startWizard(
  client: SupabaseClient<Database>
): Promise<string> {
  try {
    // Verify user is authenticated
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      throw new ValidationError('User must be authenticated to start wizard');
    }

    // Generate unique session ID
    const sessionId = `wiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create wizard session
    const session: WizardSession = {
      id: sessionId,
      step: 1,
      data: {
        created_at: new Date().toISOString(),
      },
    };
    
    wizardSessions.set(sessionId, session);
    
    return sessionId;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Gets the current wizard session
 * 
 * @param sessionId Wizard session ID
 * @returns Wizard session
 * @throws NotFoundError if session not found
 */
export function getWizardSession(sessionId: string): WizardSession {
  const session = wizardSessions.get(sessionId);
  if (!session) {
    throw new NotFoundError(`Wizard session not found: ${sessionId}`);
  }
  return session;
}

/**
 * Submits data for a specific wizard step
 * 
 * @param sessionId Wizard session ID
 * @param stepId Step identifier (1-5)
 * @param payload Data for the step
 * @returns Next step number or 'complete' if finished
 */
export async function submitWizardStep(
  sessionId: string,
  stepId: number,
  payload: Record<string, any>
): Promise<{ nextStep: number | 'complete'; session: WizardSession }> {
  try {
    const session = getWizardSession(sessionId);
    
    // Validate step sequence
    if (stepId !== session.step) {
      throw new ValidationError(
        `Expected step ${session.step}, but received step ${stepId}`
      );
    }
    
    // Validate and merge step data
    switch (stepId) {
      case 1: // Basics
        validateStep1(payload);
        session.data.name = payload.name;
        session.data.description = payload.description;
        session.data.repo_url = payload.repo_url;
        session.data.main_branch = payload.main_branch || 'main';
        session.data.language = payload.language;
        session.data.framework = payload.framework;
        break;
        
      case 2: // Goals & DoD
        validateStep2(payload);
        session.data.goals = payload.goals;
        session.data.definition_of_done = payload.definition_of_done;
        session.data.deliverables = payload.deliverables || [];
        break;
        
      case 3: // Risks & Constraints
        validateStep3(payload);
        session.data.risk_areas = payload.risk_areas || [];
        session.data.do_not_touch = payload.do_not_touch || [];
        session.data.preferences = payload.preferences || {};
        break;
        
      case 4: // Gates
        validateStep4(payload);
        session.data.gate_pack_id = payload.gate_pack_id;
        session.data.custom_gates = payload.custom_gates || [];
        break;
        
      case 5: // Review (no validation, just confirmation)
        // Step 5 is just review, no new data
        break;
        
      default:
        throw new ValidationError(`Invalid step: ${stepId}`);
    }
    
    // Advance to next step or mark complete
    const nextStep = stepId < 5 ? stepId + 1 : 'complete';
    if (typeof nextStep === 'number') {
      session.step = nextStep;
    }
    
    return { nextStep, session };
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Finishes the wizard and creates the project with all related entities
 * 
 * @param client Authenticated Supabase client
 * @param sessionId Wizard session ID
 * @returns Created project with related entities
 */
export async function finishWizard(
  client: SupabaseClient<Database>,
  sessionId: string
): Promise<{
  project: any;
  projectSpec: any;
  tasks: any[];
  checkpoint: any;
}> {
  try {
    const session = getWizardSession(sessionId);
    const { data } = session;
    
    // Validate all required fields are present
    if (!data.name || !data.goals || !data.definition_of_done) {
      throw new ValidationError(
        'Wizard not complete: missing required fields (name, goals, definition_of_done)'
      );
    }
    
    // Get authenticated user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      throw new ValidationError('User must be authenticated to finish wizard');
    }
    const userId = user.id;
    
    // Step 1: Create project with gate configuration
    const defaultGates = data.custom_gates?.length 
      ? data.custom_gates.map(g => 
          g.config ? `${g.type}:${formatGateConfig(g.config)}` : g.type
        )
      : ['has_artifacts:minCount=1', 'acceptance_met'];
    
    const project = await createProject(client, {
      name: data.name,
      description: data.description || null,
      rules: {
        defaultGates,
        constraints: data.do_not_touch || [],
      },
    } as any);
    
    // Step 2: Create project spec
    const projectSpec = await createProjectSpec(client, project.id, {
      goals: data.goals,
      definition_of_done: data.definition_of_done,
      deliverables: data.deliverables || [],
      repo_context: {
        repo_url: data.repo_url,
        main_branch: data.main_branch || 'main',
        language: data.language,
        framework: data.framework,
      },
      risk_areas: data.risk_areas || [],
      preferences: data.preferences || {},
      gate_pack_id: data.gate_pack_id || null,
      custom_gates: data.custom_gates || [],
    });
    
    // Step 3: Create seed tasks based on deliverables
    const tasks = [];
    if (data.deliverables && data.deliverables.length > 0) {
      for (const deliverable of data.deliverables) {
        const task = await createTask(client, project.id, {
          title: deliverable.name,
          description: deliverable.description,
          status: 'todo',
          priority: 'medium',
          acceptance_criteria: deliverable.acceptance_criteria || [],
        } as any);
        tasks.push(task);
      }
    }
    
    // Step 4: Create initial checkpoint
    const checkpoint = await createCheckpoint(userId, project.id, {
      label: 'Project Kickoff',
      summary: 'Initial project setup from wizard',
      resumeInstructions: `This project was created through the wizard. Initial tasks: ${tasks.length}. Gate configuration: ${defaultGates.join(', ')}.`,
      repoRef: data.repo_url || null,
    });
    
    // Step 5: Emit wizard completion event
    await emitEvent({
      project_id: project.id,
      user_id: userId,
      event_type: 'ProjectCreated',
      payload: {
        project_id: project.id,
        name: project.name,
        description: project.description,
        created_via: 'wizard',
        wizard_session_id: sessionId,
        initial_tasks: tasks.length,
        deliverables: data.deliverables?.length || 0,
      },
    });
    
    // Clean up wizard session
    wizardSessions.delete(sessionId);
    
    return {
      project,
      projectSpec,
      tasks,
      checkpoint,
    };
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

/**
 * Creates a project spec in the database
 */
async function createProjectSpec(
  client: SupabaseClient<Database>,
  projectId: string,
  data: {
    goals: string;
    definition_of_done: string;
    deliverables: any[];
    repo_context: any;
    risk_areas: string[];
    preferences: any;
    gate_pack_id: string | null;
    custom_gates: any[];
  }
): Promise<any> {
  const { data: spec, error } = await client
    .from('project_specs')
    .insert([
      {
        project_id: projectId,
        goals: data.goals,
        definition_of_done: data.definition_of_done,
        deliverables: data.deliverables,
        repo_context: data.repo_context,
        risk_areas: data.risk_areas,
        preferences: data.preferences,
        gate_pack_id: data.gate_pack_id,
        custom_gates: data.custom_gates,
      },
    ])
    .select()
    .single();
  
  if (error) {
    throw mapSupabaseError(error);
  }
  
  if (!spec) {
    throw new NotFoundError('Failed to create project spec');
  }
  
  return spec;
}

/**
 * Formats gate config object to string format for storage
 */
function formatGateConfig(config: Record<string, any>): string {
  return Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

/**
 * Step validation functions
 */
function validateStep1(payload: Record<string, any>): void {
  if (!payload.name || typeof payload.name !== 'string') {
    throw new ValidationError('Step 1: name is required and must be a string');
  }
  if (payload.name.trim().length < 3) {
    throw new ValidationError('Step 1: name must be at least 3 characters');
  }
}

function validateStep2(payload: Record<string, any>): void {
  if (!payload.goals || typeof payload.goals !== 'string') {
    throw new ValidationError('Step 2: goals is required and must be a string');
  }
  if (!payload.definition_of_done || typeof payload.definition_of_done !== 'string') {
    throw new ValidationError('Step 2: definition_of_done is required and must be a string');
  }
  if (payload.deliverables && !Array.isArray(payload.deliverables)) {
    throw new ValidationError('Step 2: deliverables must be an array');
  }
}

function validateStep3(payload: Record<string, any>): void {
  if (payload.risk_areas && !Array.isArray(payload.risk_areas)) {
    throw new ValidationError('Step 3: risk_areas must be an array');
  }
  if (payload.do_not_touch && !Array.isArray(payload.do_not_touch)) {
    throw new ValidationError('Step 3: do_not_touch must be an array');
  }
  if (payload.preferences && typeof payload.preferences !== 'object') {
    throw new ValidationError('Step 3: preferences must be an object');
  }
}

function validateStep4(payload: Record<string, any>): void {
  if (payload.gate_pack_id && typeof payload.gate_pack_id !== 'string') {
    throw new ValidationError('Step 4: gate_pack_id must be a string');
  }
  if (payload.custom_gates && !Array.isArray(payload.custom_gates)) {
    throw new ValidationError('Step 4: custom_gates must be an array');
  }
  if (payload.custom_gates) {
    for (const gate of payload.custom_gates) {
      if (!gate.type || typeof gate.type !== 'string') {
        throw new ValidationError('Step 4: each custom gate must have a type string');
      }
    }
  }
}

/**
 * Cancels a wizard session
 * 
 * @param sessionId Wizard session ID
 */
export function cancelWizard(sessionId: string): void {
  wizardSessions.delete(sessionId);
}

/**
 * Gets project spec for a project
 * 
 * @param client Authenticated Supabase client
 * @param projectId Project ID
 * @returns Project spec
 */
export async function getProjectSpec(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<ProjectSpec> {
  try {
    const { data: spec, error } = await client
      .from('project_specs')
      .select('*')
      .eq('project_id', projectId)
      .single();
    
    if (error) {
      throw mapSupabaseError(error);
    }
    
    if (!spec) {
      throw new NotFoundError('Project spec not found');
    }
    
    return spec as ProjectSpec;
  } catch (error) {
    if (error instanceof Error && error.name.includes('Error')) {
      throw error;
    }
    throw mapSupabaseError(error);
  }
}

