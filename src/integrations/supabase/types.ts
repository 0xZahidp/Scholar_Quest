export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_key: string;
          id: string;
          unlocked_at: string | null;
          user_id: string;
        };
        Insert: {
          badge_key: string;
          id?: string;
          unlocked_at?: string | null;
          user_id: string;
        };
        Update: {
          badge_key?: string;
          id?: string;
          unlocked_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_briefings: {
        Row: {
          content: Json;
          created_at: string | null;
          id: string;
          kind: string;
          user_id: string;
        };
        Insert: {
          content: Json;
          created_at?: string | null;
          id?: string;
          kind: string;
          user_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string | null;
          id?: string;
          kind?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mentor_usage_daily: {
        Row: {
          created_at: string;
          id: string;
          messages_used: number;
          updated_at: string;
          usage_date: string;
          user_id: string;
          voice_seconds_used: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          messages_used?: number;
          updated_at?: string;
          usage_date?: string;
          user_id: string;
          voice_seconds_used?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          messages_used?: number;
          updated_at?: string;
          usage_date?: string;
          user_id?: string;
          voice_seconds_used?: number;
        };
        Relationships: [];
      };
      mentor_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      checklist_items: {
        Row: {
          created_at: string;
          due_date: string | null;
          id: string;
          kind: string;
          notes: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          kind: string;
          notes?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          kind?: string;
          notes?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_tasks: {
        Row: {
          completed: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          description: string | null;
          for_date: string | null;
          id: string;
          phase: string | null;
          title: string;
          user_id: string;
          xp_reward: number | null;
        };
        Insert: {
          completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          for_date?: string | null;
          id?: string;
          phase?: string | null;
          title: string;
          user_id: string;
          xp_reward?: number | null;
        };
        Update: {
          completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          for_date?: string | null;
          id?: string;
          phase?: string | null;
          title?: string;
          user_id?: string;
          xp_reward?: number | null;
        };
        Relationships: [];
      };
      deadlines: {
        Row: {
          category: string | null;
          created_at: string | null;
          due_date: string;
          id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          due_date: string;
          id?: string;
          title: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          due_date?: string;
          id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          created_at: string;
          file_path: string | null;
          file_url: string | null;
          id: string;
          kind: string;
          notes: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          file_path?: string | null;
          file_url?: string | null;
          id?: string;
          kind: string;
          notes?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          file_path?: string | null;
          file_url?: string | null;
          id?: string;
          kind?: string;
          notes?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      dream_scholarships: {
        Row: {
          created_at: string | null;
          id: string;
          scholarship_key: string;
          status: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          scholarship_key: string;
          status?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          scholarship_key?: string;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      finance_entries: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          kind: string;
          label: string;
          occurred_on: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          kind: string;
          label: string;
          occurred_on?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          kind?: string;
          label?: string;
          occurred_on?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ielts_mocks: {
        Row: {
          created_at: string | null;
          id: string;
          listening: number | null;
          notes: string | null;
          overall: number | null;
          reading: number | null;
          speaking: number | null;
          taken_on: string;
          user_id: string;
          writing: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          listening?: number | null;
          notes?: string | null;
          overall?: number | null;
          reading?: number | null;
          speaking?: number | null;
          taken_on?: string;
          user_id: string;
          writing?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          listening?: number | null;
          notes?: string | null;
          overall?: number | null;
          reading?: number | null;
          speaking?: number | null;
          taken_on?: string;
          user_id?: string;
          writing?: number | null;
        };
        Relationships: [];
      };
      ielts_targets: {
        Row: {
          exam_date: string | null;
          target_listening: number | null;
          target_overall: number | null;
          target_reading: number | null;
          target_speaking: number | null;
          target_writing: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          exam_date?: string | null;
          target_listening?: number | null;
          target_overall?: number | null;
          target_reading?: number | null;
          target_speaking?: number | null;
          target_writing?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          exam_date?: string | null;
          target_listening?: number | null;
          target_overall?: number | null;
          target_reading?: number | null;
          target_speaking?: number | null;
          target_writing?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      professors: {
        Row: {
          created_at: string;
          email: string | null;
          field: string | null;
          id: string;
          last_contact_on: string | null;
          name: string;
          notes: string | null;
          status: string;
          university: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          field?: string | null;
          id?: string;
          last_contact_on?: string | null;
          name: string;
          notes?: string | null;
          status?: string;
          university?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          field?: string | null;
          id?: string;
          last_contact_on?: string | null;
          name?: string;
          notes?: string | null;
          status?: string;
          university?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          budget_goal: number | null;
          budget_saved: number | null;
          country: string | null;
          created_at: string | null;
          current_streak: number | null;
          cv_status: string | null;
          display_name: string | null;
          has_passport: boolean | null;
          id: string;
          ielts_status: string | null;
          last_checkin_date: string | null;
          onboarded: boolean | null;
          target_countries: string[] | null;
          target_degree: string | null;
          target_departure_date: string | null;
          target_fields: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          budget_goal?: number | null;
          budget_saved?: number | null;
          country?: string | null;
          created_at?: string | null;
          current_streak?: number | null;
          cv_status?: string | null;
          display_name?: string | null;
          has_passport?: boolean | null;
          id: string;
          ielts_status?: string | null;
          last_checkin_date?: string | null;
          onboarded?: boolean | null;
          target_countries?: string[] | null;
          target_degree?: string | null;
          target_departure_date?: string | null;
          target_fields?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          budget_goal?: number | null;
          budget_saved?: number | null;
          country?: string | null;
          created_at?: string | null;
          current_streak?: number | null;
          cv_status?: string | null;
          display_name?: string | null;
          has_passport?: boolean | null;
          id?: string;
          ielts_status?: string | null;
          last_checkin_date?: string | null;
          onboarded?: boolean | null;
          target_countries?: string[] | null;
          target_degree?: string | null;
          target_departure_date?: string | null;
          target_fields?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      universities: {
        Row: {
          country: string | null;
          created_at: string;
          deadline: string | null;
          id: string;
          name: string;
          notes: string | null;
          program: string | null;
          ranking: number | null;
          status: string;
          tuition_usd: number | null;
          user_id: string;
        };
        Insert: {
          country?: string | null;
          created_at?: string;
          deadline?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          program?: string | null;
          ranking?: number | null;
          status?: string;
          tuition_usd?: number | null;
          user_id: string;
        };
        Update: {
          country?: string | null;
          created_at?: string;
          deadline?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          program?: string | null;
          ranking?: number | null;
          status?: string;
          tuition_usd?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      xp_events: {
        Row: {
          amount: number;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          reason: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          reason: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          reason?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_mentor_message: {
        Args: {
          p_limit: number;
        };
        Returns: {
          allowed: boolean;
          daily_limit: number;
          messages_used: number;
        }[];
      };
      consume_mentor_voice_seconds: {
        Args: {
          p_limit_seconds: number;
          p_seconds: number;
        };
        Returns: {
          allowed: boolean;
          daily_limit_seconds: number;
          voice_seconds_used: number;
        }[];
      };
      reset_user_progress: {
        Args: Record<PropertyKey, never>;
        Returns: {
          ok: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
