export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_sessions: {
        Row: {
          created_at: string
          id: string
          project_id: string
          snapshot: Json
          summary: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          snapshot: Json
          summary?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          snapshot?: Json
          summary?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          blocked_reason: string | null
          context: string | null
          created_at: string
          depends_on_ids: string[] | null
          goal: string
          id: string
          inputs: string | null
          locked_at: string | null
          locked_by: string | null
          output_expectation: string | null
          project_id: string
          risk: string | null
          status: string
          timebox_minutes: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
          verification: string | null
          work_item_id: string | null
          workspace_id: string | null
        }
        Insert: {
          blocked_reason?: string | null
          context?: string | null
          created_at?: string
          depends_on_ids?: string[] | null
          goal: string
          id?: string
          inputs?: string | null
          locked_at?: string | null
          locked_by?: string | null
          output_expectation?: string | null
          project_id: string
          risk?: string | null
          status?: string
          timebox_minutes?: number | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          verification?: string | null
          work_item_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          blocked_reason?: string | null
          context?: string | null
          created_at?: string
          depends_on_ids?: string[] | null
          goal?: string
          id?: string
          inputs?: string | null
          locked_at?: string | null
          locked_by?: string | null
          output_expectation?: string | null
          project_id?: string
          risk?: string | null
          status?: string
          timebox_minutes?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          verification?: string | null
          work_item_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_item_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          created_at: string
          id: string
          ref: string
          summary: string | null
          task_id: string
          type: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ref: string
          summary?: string | null
          task_id: string
          type: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ref?: string
          summary?: string | null
          task_id?: string
          type?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "active_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          created_at: string
          id: string
          label: string
          project_id: string
          repo_ref: string | null
          resume_instructions: string | null
          snapshot: Json
          summary: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          project_id: string
          repo_ref?: string | null
          resume_instructions?: string | null
          snapshot?: Json
          summary: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          project_id?: string
          repo_ref?: string | null
          resume_instructions?: string | null
          snapshot?: Json
          summary?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkpoints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkpoints_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      constraints: {
        Row: {
          created_at: string
          enforcement_level: string
          id: string
          project_id: string
          rule_text: string
          scope: string
          scope_value: string | null
          source_links: Json | null
          trigger: string
          trigger_value: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          enforcement_level: string
          id?: string
          project_id: string
          rule_text: string
          scope: string
          scope_value?: string | null
          source_links?: Json | null
          trigger: string
          trigger_value?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          enforcement_level?: string
          id?: string
          project_id?: string
          rule_text?: string
          scope?: string
          scope_value?: string | null
          source_links?: Json | null
          trigger?: string
          trigger_value?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "constraints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constraints_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          choice: string
          created_at: string
          id: string
          options: Json
          project_id: string
          rationale: string
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          choice: string
          created_at?: string
          id?: string
          options?: Json
          project_id: string
          rationale: string
          title: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          choice?: string
          created_at?: string
          id?: string
          options?: Json
          project_id?: string
          rationale?: string
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          project_id: string
          task_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          project_id: string
          task_id?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          project_id?: string
          task_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "active_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          project_id: string
          task_id: string | null
          type: string
          user_id: string
          work_item_id: string | null
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          task_id?: string | null
          type: string
          user_id: string
          work_item_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          task_id?: string | null
          type?: string
          user_id?: string
          work_item_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_task_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_item_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_runs: {
        Row: {
          created_at: string
          exit_code: number | null
          gate_id: string
          id: string
          project_id: string
          status: string
          stderr: string | null
          stdout: string | null
          task_id: string | null
          user_id: string
          work_item_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          exit_code?: number | null
          gate_id: string
          id?: string
          project_id: string
          status: string
          stderr?: string | null
          stdout?: string | null
          task_id?: string | null
          user_id: string
          work_item_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          exit_code?: number | null
          gate_id?: string
          id?: string
          project_id?: string
          status?: string
          stderr?: string | null
          stdout?: string | null
          task_id?: string | null
          user_id?: string
          work_item_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_runs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_runs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "latest_gate_status"
            referencedColumns: ["gate_id"]
          },
          {
            foreignKeyName: "gate_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_task_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_runs_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_item_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_runs_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_runs_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gates: {
        Row: {
          command: string | null
          created_at: string
          id: string
          is_required: boolean
          name: string
          project_id: string
          runner_mode: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          command?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
          project_id: string
          runner_mode: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          command?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          name?: string
          project_id?: string
          runner_mode?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gates_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_pending_requests: {
        Row: {
          authorization_code: string | null
          client_id: string
          code_challenge: string
          code_challenge_method: string
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          scope: string | null
          state: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          authorization_code?: string | null
          client_id: string
          code_challenge: string
          code_challenge_method?: string
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri: string
          scope?: string | null
          state?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          authorization_code?: string | null
          client_id?: string
          code_challenge?: string
          code_challenge_method?: string
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          scope?: string | null
          state?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      outcomes: {
        Row: {
          created_at: string
          created_by: string
          evidence_ids: string[] | null
          id: string
          notes: string | null
          project_id: string
          recommendation: string | null
          result: string
          root_cause: string | null
          subject_id: string
          subject_type: string
          tags: string[] | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          evidence_ids?: string[] | null
          id?: string
          notes?: string | null
          project_id: string
          recommendation?: string | null
          result: string
          root_cause?: string | null
          subject_id: string
          subject_type: string
          tags?: string[] | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          evidence_ids?: string[] | null
          id?: string
          notes?: string | null
          project_id?: string
          recommendation?: string | null
          result?: string
          root_cause?: string | null
          subject_id?: string
          subject_type?: string
          tags?: string[] | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcomes_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_specs: {
        Row: {
          created_at: string
          custom_gates: Json | null
          definition_of_done: string
          deliverables: Json | null
          gate_pack_id: string | null
          goals: string
          id: string
          preferences: Json | null
          project_id: string
          repo_context: Json | null
          risk_areas: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          custom_gates?: Json | null
          definition_of_done: string
          deliverables?: Json | null
          gate_pack_id?: string | null
          goals: string
          id?: string
          preferences?: Json | null
          project_id: string
          repo_context?: Json | null
          risk_areas?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          custom_gates?: Json | null
          definition_of_done?: string
          deliverables?: Json | null
          gate_pack_id?: string | null
          goals?: string
          id?: string
          preferences?: Json | null
          project_id?: string
          repo_context?: Json | null
          risk_areas?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_specs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_specs_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          conventions_markdown: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          rules: Json | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          conventions_markdown?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rules?: Json | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          conventions_markdown?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rules?: Json | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          acceptance_criteria: string[] | null
          constraints: Json | null
          created_at: string
          dependencies: string[] | null
          description: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          priority: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          acceptance_criteria?: string[] | null
          constraints?: Json | null
          created_at?: string
          dependencies?: string[] | null
          description?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          priority?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          acceptance_criteria?: string[] | null
          constraints?: Json | null
          created_at?: string
          dependencies?: string[] | null
          description?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          priority?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_workspace_id_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string
          joined_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          is_personal: boolean
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          is_personal?: boolean
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          is_personal?: boolean
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_tasks: {
        Row: {
          acceptance_criteria: string[] | null
          constraints: Json | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          id: string | null
          is_actively_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          priority: string | null
          project_id: string | null
          project_name: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_task_details: {
        Row: {
          blocked_reason: string | null
          context: string | null
          created_at: string | null
          depends_on_ids: string[] | null
          evidence_count: number | null
          evidence_types: string[] | null
          goal: string | null
          id: string | null
          inputs: string | null
          locked_at: string | null
          locked_by: string | null
          output_expectation: string | null
          project_id: string | null
          risk: string | null
          status: string | null
          timebox_minutes: number | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          verification: string | null
          work_item_id: string | null
          work_item_title: string | null
          work_item_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_item_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      latest_gate_status: {
        Row: {
          gate_id: string | null
          gate_name: string | null
          is_required: boolean | null
          last_run_at: string | null
          latest_status: string | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_events: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string | null
          payload: Json | null
          project_id: string | null
          project_name: string | null
          task_id: string | null
          task_title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "active_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_progress: {
        Row: {
          artifact_count: number | null
          created_at: string | null
          id: string | null
          locked_at: string | null
          locked_by: string | null
          priority: string | null
          project_id: string | null
          status: string | null
          title: string | null
          total_criteria: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_progress: {
        Row: {
          blocked_tasks: number | null
          created_at: string | null
          description: string | null
          doing_tasks: number | null
          done_tasks: number | null
          evidence_count: number | null
          external_url: string | null
          id: string | null
          project_id: string | null
          status: string | null
          title: string | null
          total_tasks: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_personal_workspace_for_user: {
        Args: {
          user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

