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
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details: Json
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_value: string
          name: string
          source: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_value: string
          name: string
          source: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_value?: string
          name?: string
          source?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          depth: number
          id: string
          name: string
          parent_id: string | null
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          depth?: number
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          depth?: number
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      columns: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kanban_type: string | null
          name: string
          position: number
          show_in_projects: boolean | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kanban_type?: string | null
          name: string
          position: number
          show_in_projects?: boolean | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kanban_type?: string | null
          name?: string
          position?: number
          show_in_projects?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      course_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          author: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          current_episode: number | null
          current_module: number | null
          id: string
          is_favorite: boolean | null
          modules_checklist: Json | null
          name: string
          notes: string | null
          platform: string | null
          price: number | null
          priority: string | null
          started_at: string | null
          status: string | null
          total_episodes: number | null
          total_modules: number | null
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_episode?: number | null
          current_module?: number | null
          id?: string
          is_favorite?: boolean | null
          modules_checklist?: Json | null
          name: string
          notes?: string | null
          platform?: string | null
          price?: number | null
          priority?: string | null
          started_at?: string | null
          status?: string | null
          total_episodes?: number | null
          total_modules?: number | null
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          author?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_episode?: number | null
          current_module?: number | null
          id?: string
          is_favorite?: boolean | null
          modules_checklist?: Json | null
          name?: string
          notes?: string | null
          platform?: string | null
          price?: number | null
          priority?: string | null
          started_at?: string | null
          status?: string | null
          total_episodes?: number | null
          total_modules?: number | null
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          auto_increment: boolean
          created_at: string
          current: number
          end_date: string
          id: string
          is_completed: boolean
          period: string
          start_date: string
          target: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_increment?: boolean
          created_at?: string
          current?: number
          end_date: string
          id?: string
          is_completed?: boolean
          period?: string
          start_date?: string
          target?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_increment?: boolean
          created_at?: string
          current?: number
          end_date?: string
          id?: string
          is_completed?: boolean
          period?: string
          start_date?: string
          target?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notebooks: {
        Row: {
          created_at: string
          id: string
          name: string
          tags: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          tags?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tags?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          color: string | null
          content: string | null
          created_at: string
          id: string
          is_pinned: boolean
          linked_task_id: string | null
          notebook_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          linked_task_id?: string | null
          notebook_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          linked_task_id?: string | null
          notebook_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          duration_minutes: number
          ended_at: string | null
          id: string
          session_type: string
          started_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          session_type?: string
          started_at?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          session_type?: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_templates: {
        Row: {
          created_at: string
          id: string
          long_break: number
          name: string
          sessions_until_long: number
          short_break: number
          updated_at: string
          user_id: string
          work_duration: number
        }
        Insert: {
          created_at?: string
          id?: string
          long_break?: number
          name: string
          sessions_until_long?: number
          short_break?: number
          updated_at?: string
          user_id: string
          work_duration?: number
        }
        Update: {
          created_at?: string
          id?: string
          long_break?: number
          name?: string
          sessions_until_long?: number
          short_break?: number
          updated_at?: string
          user_id?: string
          work_duration?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          is_public: boolean
          name: string
          usage_count: number
        }
        Insert: {
          config: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_public?: boolean
          name: string
          usage_count?: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_public?: boolean
          name?: string
          usage_count?: number
        }
        Relationships: []
      }
      push_logs: {
        Row: {
          body: string
          clicked_at: string | null
          data: Json | null
          delivered_at: string | null
          device_name: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          notification_type: string | null
          status: string
          timestamp: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          clicked_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          device_name?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          notification_type?: string | null
          status: string
          timestamp?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          clicked_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          device_name?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          notification_type?: string | null
          status?: string
          timestamp?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_name: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_name?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_name?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      task_completion_logs: {
        Row: {
          comment: string | null
          completed_at: string
          created_at: string | null
          id: string
          metric_type: string | null
          metric_value: number | null
          task_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          completed_at?: string
          created_at?: string | null
          id?: string
          metric_type?: string | null
          metric_value?: number | null
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          completed_at?: string
          created_at?: string | null
          id?: string
          metric_type?: string | null
          metric_value?: number | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completion_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          changes: Json
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          changes: Json
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category_id: string
          column_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          is_favorite: boolean
          linked_note_id: string | null
          metric_type: string | null
          mirror_task_id: string | null
          position: number
          priority: string | null
          recurrence_rule: Json | null
          subtasks: Json | null
          tags: string[] | null
          title: string
          track_comments: boolean | null
          track_metrics: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          column_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          is_favorite?: boolean
          linked_note_id?: string | null
          metric_type?: string | null
          mirror_task_id?: string | null
          position?: number
          priority?: string | null
          recurrence_rule?: Json | null
          subtasks?: Json | null
          tags?: string[] | null
          title: string
          track_comments?: boolean | null
          track_metrics?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          column_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          is_favorite?: boolean
          linked_note_id?: string | null
          metric_type?: string | null
          mirror_task_id?: string | null
          position?: number
          priority?: string | null
          recurrence_rule?: Json | null
          subtasks?: Json | null
          tags?: string[] | null
          title?: string
          track_comments?: boolean | null
          track_metrics?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_linked_note_id_fkey"
            columns: ["linked_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_mirror_task_id_fkey"
            columns: ["mirror_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_function_assignments: {
        Row: {
          created_at: string | null
          function_id: string
          id: string
          tool_id: string
        }
        Insert: {
          created_at?: string | null
          function_id: string
          id?: string
          tool_id: string
        }
        Update: {
          created_at?: string | null
          function_id?: string
          id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_function_assignments_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "tool_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_function_assignments_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_functions: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          api_key: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_favorite: boolean | null
          monthly_cost: number | null
          name: string
          site_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          monthly_cost?: number | null
          name: string
          site_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          monthly_cost?: number | null
          name?: string
          site_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trash: {
        Row: {
          deleted_at: string
          id: string
          item_data: Json
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          item_data: Json
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          item_data?: Json
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          best_streak: number
          created_at: string
          current_streak: number
          id: string
          level: number
          tasks_completed_today: number
          tasks_completed_week: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          level?: number
          tasks_completed_today?: number
          tasks_completed_week?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          level?: number
          tasks_completed_today?: number
          tasks_completed_week?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fix_note_task_integrity: {
        Args: never
        Returns: {
          fixed_notes: number
          fixed_tasks: number
          issues_found: string[]
        }[]
      }
      get_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_productivity_7_days: {
        Args: { p_user_id: string }
        Returns: {
          completed_count: number
          day: string
          day_name: string
        }[]
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
    Enums: {},
  },
} as const
