export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string | null
          gradient_from: string
          gradient_to: string
          icon: string
          id: string
          required_value: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gradient_from?: string
          gradient_to?: string
          icon?: string
          id?: string
          required_value: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gradient_from?: string
          gradient_to?: string
          icon?: string
          id?: string
          required_value?: number
          title?: string
        }
        Relationships: []
      }
      environment_activity_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          environment_id: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          environment_id: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          environment_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "environment_activity_log_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "shared_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_members: {
        Row: {
          created_at: string
          email: string
          environment_id: string
          id: string
          permissions: Database["public"]["Enums"]["environment_permission"][]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          environment_id: string
          id?: string
          permissions?: Database["public"]["Enums"]["environment_permission"][]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          environment_id?: string
          id?: string
          permissions?: Database["public"]["Enums"]["environment_permission"][]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environment_members_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "shared_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_statuses: {
        Row: {
          color: string | null
          created_at: string
          environment_id: string
          id: string
          is_default: boolean
          name: string
          order_index: number
          parent_id: string | null
          show_in_dashboard: boolean
          show_in_kanban: boolean
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          environment_id: string
          id?: string
          is_default?: boolean
          name: string
          order_index?: number
          parent_id?: string | null
          show_in_dashboard?: boolean
          show_in_kanban?: boolean
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          environment_id?: string
          id?: string
          is_default?: boolean
          name?: string
          order_index?: number
          parent_id?: string | null
          show_in_dashboard?: boolean
          show_in_kanban?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "environment_statuses_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "shared_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_statuses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "environment_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_subjects: {
        Row: {
          color: string | null
          created_at: string
          environment_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          environment_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          environment_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "environment_subjects_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "shared_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          ended_at: string
          id: string
          started_at: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          ended_at?: string
          id?: string
          started_at?: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          ended_at?: string
          id?: string
          started_at?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_uses: {
        Row: {
          id: string
          invite_id: string
          used_at: string
          used_by: string
        }
        Insert: {
          id?: string
          invite_id: string
          used_at?: string
          used_by: string
        }
        Update: {
          id?: string
          invite_id?: string
          used_at?: string
          used_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_uses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          created_by: string
          environment_id: string | null
          expires_at: string
          id: string
          max_uses: number | null
          revoked: boolean
          token: string
          type: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          environment_id?: string | null
          expires_at?: string
          id?: string
          max_uses?: number | null
          revoked?: boolean
          token?: string
          type: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          environment_id?: string | null
          expires_at?: string
          id?: string
          max_uses?: number | null
          revoked?: boolean
          token?: string
          type?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "shared_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_goals: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          id: string
          progress: number
          subject_id: string | null
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          progress?: number
          subject_id?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          progress?: number
          subject_id?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_notes: {
        Row: {
          color: string | null
          completed: boolean
          content: string
          created_at: string
          id: string
          pinned: boolean
          planned_date: string | null
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          completed?: boolean
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          planned_date?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          completed?: boolean
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          planned_date?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          created_at: string | null
          current_streak: number | null
          education_level: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_activity_date: string | null
          onboarding_completed: boolean
          phone: string | null
          pomodoro_sessions: number | null
          role: string | null
          terms_accepted: boolean | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          current_streak?: number | null
          education_level?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_activity_date?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          pomodoro_sessions?: number | null
          role?: string | null
          terms_accepted?: boolean | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          current_streak?: number | null
          education_level?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_date?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          pomodoro_sessions?: number | null
          role?: string | null
          terms_accepted?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_environments: {
        Row: {
          created_at: string
          description: string | null
          environment_name: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment_name: string
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          environment_name?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_cycle_blocks: {
        Row: {
          allocated_minutes: number
          cycle_id: string
          id: string
          order_index: number
          subject_id: string
        }
        Insert: {
          allocated_minutes?: number
          cycle_id: string
          id?: string
          order_index?: number
          subject_id: string
        }
        Update: {
          allocated_minutes?: number
          cycle_id?: string
          id?: string
          order_index?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_cycle_blocks_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "study_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_cycle_blocks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_cycles: {
        Row: {
          created_at: string
          current_block_index: number
          current_block_remaining_seconds: number | null
          id: string
          is_active: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_block_index?: number
          current_block_remaining_seconds?: number | null
          id?: string
          is_active?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_block_index?: number
          current_block_remaining_seconds?: number | null
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_banners: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_link: boolean | null
          task_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_link?: boolean | null
          task_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_link?: boolean | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_statuses: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          order_index: number
          parent_id: string | null
          show_in_dashboard: boolean
          show_in_kanban: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          order_index?: number
          parent_id?: string | null
          show_in_dashboard?: boolean
          show_in_kanban?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          order_index?: number
          parent_id?: string | null
          show_in_dashboard?: boolean
          show_in_kanban?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_statuses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      task_step_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_link: boolean | null
          task_step_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_link?: boolean | null
          task_step_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_link?: boolean | null
          task_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_step_attachments_task_step_id_fkey"
            columns: ["task_step_id"]
            isOneToOne: false
            referencedRelation: "task_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      task_steps: {
        Row: {
          canva_link: string | null
          checklist: Json | null
          created_at: string | null
          description: string | null
          due_date: string | null
          google_docs_link: string | null
          id: string
          order_index: number
          status: string
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          canva_link?: string | null
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          google_docs_link?: string | null
          id?: string
          order_index?: number
          status?: string
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          canva_link?: string | null
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          google_docs_link?: string | null
          id?: string
          order_index?: number
          status?: string
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          canva_link: string | null
          checklist: Json | null
          created_at: string | null
          description: string | null
          due_date: string | null
          environment_id: string | null
          google_docs_link: string | null
          group_members: string | null
          id: string
          is_archived: boolean
          is_group_work: boolean | null
          status: string
          subject_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canva_link?: string | null
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          environment_id?: string | null
          google_docs_link?: string | null
          group_members?: string | null
          id?: string
          is_archived?: boolean
          is_group_work?: boolean | null
          status?: string
          subject_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canva_link?: string | null
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          environment_id?: string | null
          google_docs_link?: string | null
          group_members?: string | null
          id?: string
          is_archived?: boolean
          is_group_work?: boolean | null
          status?: string
          subject_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "shared_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_archive_tasks: { Args: never; Returns: undefined }
      can_access_task_attachment: {
        Args: { file_path: string; requesting_user_id: string }
        Returns: boolean
      }
      check_overdue_tasks: { Args: never; Returns: undefined }
      check_planner_notifications: { Args: never; Returns: undefined }
      check_upcoming_tasks: { Args: never; Returns: undefined }
      consume_invite: { Args: { invite_token: string }; Returns: Json }
      create_default_environment_statuses: {
        Args: { target_environment_id: string }
        Returns: undefined
      }
      create_default_task_statuses: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_active_users_count: { Args: never; Returns: number }
      get_admin_stats:
        | { Args: never; Returns: Json }
        | {
            Args: { p_end_date?: string; p_start_date?: string }
            Returns: Json
          }
      get_environment_members: {
        Args: { p_environment_id: string }
        Returns: {
          created_at: string
          email: string
          environment_id: string
          id: string
          permissions: string[]
          user_id: string
        }[]
      }
      has_environment_permission: {
        Args: {
          _environment_id: string
          _permission: Database["public"]["Enums"]["environment_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_environment_member: {
        Args: { _environment_id: string; _user_id: string }
        Returns: boolean
      }
      purge_old_focus_sessions: { Args: never; Returns: undefined }
      send_broadcast_notification:
        | {
            Args: {
              p_message: string
              p_title: string
              p_type?: Database["public"]["Enums"]["notification_type"]
            }
            Returns: undefined
          }
        | {
            Args: {
              p_link?: string
              p_message: string
              p_title: string
              p_type?: Database["public"]["Enums"]["notification_type"]
            }
            Returns: undefined
          }
      send_individual_notification:
        | {
            Args: { p_message: string; p_title: string; p_user_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_link?: string
              p_message: string
              p_title: string
              p_user_id: string
            }
            Returns: undefined
          }
      validate_invite: { Args: { invite_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      environment_permission: "view" | "create" | "edit" | "delete"
      notification_type: "info" | "warning" | "success"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      environment_permission: ["view", "create", "edit", "delete"],
      notification_type: ["info", "warning", "success"],
    },
  },
} as const
