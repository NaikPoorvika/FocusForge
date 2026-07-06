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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_stats: {
        Row: {
          completed_pomodoros: number
          created_at: string
          focus_score: number
          goals_completed_today: number
          id: string
          longest_streak: number
          stat_date: string
          streak: number
          study_minutes: number
          today_distractions: number
          total_distractions: number
          updated_at: string
          user_id: string
          xp: number
          xp_spent: number
        }
        Insert: {
          completed_pomodoros?: number
          created_at?: string
          focus_score?: number
          goals_completed_today?: number
          id?: string
          longest_streak?: number
          stat_date?: string
          streak?: number
          study_minutes?: number
          today_distractions?: number
          total_distractions?: number
          updated_at?: string
          user_id: string
          xp?: number
          xp_spent?: number
        }
        Update: {
          completed_pomodoros?: number
          created_at?: string
          focus_score?: number
          goals_completed_today?: number
          id?: string
          longest_streak?: number
          stat_date?: string
          streak?: number
          study_minutes?: number
          today_distractions?: number
          total_distractions?: number
          updated_at?: string
          user_id?: string
          xp?: number
          xp_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration: number | null
          ended_at: string | null
          id: string
          started_at: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          local_id: string
          priority: string
          progress: number
          sort_order: number
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          local_id: string
          priority?: string
          progress?: number
          sort_order?: number
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          local_id?: string
          priority?: string
          progress?: number
          sort_order?: number
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean
          created_at: string
          habit_local_id: string
          id: string
          log_date: string
          skipped: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          habit_local_id: string
          id?: string
          log_date: string
          skipped?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          habit_local_id?: string
          id?: string
          log_date?: string
          skipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habits: {
        Row: {
          archived: boolean
          category: string | null
          color: string
          created_at: string
          custom_days: number[]
          emoji: string
          frequency: string
          id: string
          local_id: string
          name: string
          notes: string | null
          reminder_time: string | null
          sort_order: number
          updated_at: string
          user_id: string
          weekly_target: number | null
        }
        Insert: {
          archived?: boolean
          category?: string | null
          color?: string
          created_at?: string
          custom_days?: number[]
          emoji?: string
          frequency?: string
          id?: string
          local_id: string
          name: string
          notes?: string | null
          reminder_time?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
          weekly_target?: number | null
        }
        Update: {
          archived?: boolean
          category?: string | null
          color?: string
          created_at?: string
          custom_days?: number[]
          emoji?: string
          frequency?: string
          id?: string
          local_id?: string
          name?: string
          notes?: string | null
          reminder_time?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
          weekly_target?: number | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          entry_date: string
          id: string
          improve: string | null
          learned: string | null
          local_id: string
          mood: string | null
          problems: string | null
          tags: string[]
          title: string
          tomorrow_plan: string | null
          updated_at: string
          user_id: string
          went_well: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          improve?: string | null
          learned?: string | null
          local_id: string
          mood?: string | null
          problems?: string | null
          tags?: string[]
          title?: string
          tomorrow_plan?: string | null
          updated_at?: string
          user_id: string
          went_well?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          improve?: string | null
          learned?: string | null
          local_id?: string
          mood?: string | null
          problems?: string | null
          tags?: string[]
          title?: string
          tomorrow_plan?: string | null
          updated_at?: string
          user_id?: string
          went_well?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          archived: boolean
          category: string
          completed: boolean
          completed_at: string | null
          created_at: string
          deadline_date: string | null
          description: string | null
          due_time: string | null
          estimated_minutes: number | null
          goal_id: string | null
          id: string
          local_id: string
          notes: string | null
          priority: string
          recurrence: Json | null
          recurrence_parent_id: string | null
          sort_order: number
          tags: string[]
          task_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deadline_date?: string | null
          description?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          id?: string
          local_id: string
          notes?: string | null
          priority?: string
          recurrence?: Json | null
          recurrence_parent_id?: string | null
          sort_order?: number
          tags?: string[]
          task_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deadline_date?: string | null
          description?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          id?: string
          local_id?: string
          notes?: string | null
          priority?: string
          recurrence?: Json | null
          recurrence_parent_id?: string | null
          sort_order?: number
          tags?: string[]
          task_date?: string
          title?: string
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
      [_ in never]: never
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
