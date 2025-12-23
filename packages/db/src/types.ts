/**
 * ProjectFlow Database Types
 * These interfaces mirror the Supabase database schema
 */

/**
 * Represents a project in the system
 */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a task within a project
 */
export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | null;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a session snapshot for agent state management
 */
export interface AgentSession {
  id: string;
  project_id: string;
  user_id: string;
  snapshot: Record<string, unknown>;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Represents the shape of data when inserting a new project
 */
export interface ProjectInsert {
  name: string;
  description?: string;
}

/**
 * Represents the shape of data when updating a project
 */
export interface ProjectUpdate {
  name?: string;
  description?: string;
}

/**
 * Represents the shape of data when inserting a new task
 */
export interface TaskInsert {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Represents the shape of data when updating a task
 */
export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | null;
}

/**
 * Represents the shape of data when inserting a new agent session
 */
export interface AgentSessionInsert {
  project_id: string;
  snapshot: Record<string, unknown>;
  summary?: string;
}

/**
 * Represents the shape of data when updating an agent session
 */
export interface AgentSessionUpdate {
  snapshot?: Record<string, unknown>;
  summary?: string;
}

/**
 * Database schema type mapping for Supabase
 */
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: any;
        Update: any;
      };
      tasks: {
        Row: Task;
        Insert: any;
        Update: any;
      };
      agent_sessions: {
        Row: AgentSession;
        Insert: any;
        Update: any;
      };
    };
  };
}

