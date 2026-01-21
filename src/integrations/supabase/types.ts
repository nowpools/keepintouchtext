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
      app_contacts: {
        Row: {
          birthday: string | null
          cadence_days: number | null
          conversation_context: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          emails: Json | null
          family_name: string | null
          given_name: string | null
          google_etag: string | null
          google_resource_name: string | null
          id: string
          label: string | null
          last_contacted: string | null
          linkedin_url: string | null
          next_contact_date: string | null
          notes: string | null
          phones: Json | null
          source_preference:
            | Database["public"]["Enums"]["contact_source"]
            | null
          tags: Json | null
          updated_at: string
          user_id: string
          x_url: string | null
          youtube_url: string | null
        }
        Insert: {
          birthday?: string | null
          cadence_days?: number | null
          conversation_context?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          emails?: Json | null
          family_name?: string | null
          given_name?: string | null
          google_etag?: string | null
          google_resource_name?: string | null
          id?: string
          label?: string | null
          last_contacted?: string | null
          linkedin_url?: string | null
          next_contact_date?: string | null
          notes?: string | null
          phones?: Json | null
          source_preference?:
            | Database["public"]["Enums"]["contact_source"]
            | null
          tags?: Json | null
          updated_at?: string
          user_id: string
          x_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          birthday?: string | null
          cadence_days?: number | null
          conversation_context?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          emails?: Json | null
          family_name?: string | null
          given_name?: string | null
          google_etag?: string | null
          google_resource_name?: string | null
          id?: string
          label?: string | null
          last_contacted?: string | null
          linkedin_url?: string | null
          next_contact_date?: string | null
          notes?: string | null
          phones?: Json | null
          source_preference?:
            | Database["public"]["Enums"]["contact_source"]
            | null
          tags?: Json | null
          updated_at?: string
          user_id?: string
          x_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      contact_history: {
        Row: {
          cadence: string | null
          contact_id: string
          contact_name: string
          contacted_at: string
          created_at: string
          id: string
          label: string | null
          notes: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          cadence?: string | null
          contact_id: string
          contact_name: string
          contacted_at?: string
          created_at?: string
          id?: string
          label?: string | null
          notes?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          cadence?: string | null
          contact_id?: string
          contact_name?: string
          contacted_at?: string
          created_at?: string
          id?: string
          label?: string | null
          notes?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_links: {
        Row: {
          app_contact_id: string
          created_at: string
          external_etag: string | null
          external_id: string
          id: string
          last_pulled_at: string | null
          last_pushed_at: string | null
          source: Database["public"]["Enums"]["contact_source"]
          sync_enabled: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_contact_id: string
          created_at?: string
          external_etag?: string | null
          external_id: string
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          source: Database["public"]["Enums"]["contact_source"]
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_contact_id?: string
          created_at?: string
          external_etag?: string | null
          external_id?: string
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          source?: Database["public"]["Enums"]["contact_source"]
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_links_app_contact_id_fkey"
            columns: ["app_contact_id"]
            isOneToOne: false
            referencedRelation: "app_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      label_settings: {
        Row: {
          cadence_days: number
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          label_name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cadence_days?: number
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          label_name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cadence_days?: number
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          label_name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_trial_active: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_trial_active?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_trial_active?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_job_items: {
        Row: {
          created_at: string
          event_type: string
          id: string
          job_id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          job_id: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          job_params: Json | null
          job_type: string
          last_checkpoint: Json | null
          progress_done: number
          progress_total_estimate: number | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_params?: Json | null
          job_type?: string
          last_checkpoint?: Json | null
          progress_done?: number
          progress_total_estimate?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_params?: Json | null
          job_type?: string
          last_checkpoint?: Json | null
          progress_done?: number
          progress_total_estimate?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          app_contact_id: string | null
          created_at: string
          direction: Database["public"]["Enums"]["sync_direction"]
          error: string | null
          external_id: string | null
          id: string
          payload: Json | null
          source: Database["public"]["Enums"]["contact_source"]
          status: Database["public"]["Enums"]["sync_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          app_contact_id?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["sync_direction"]
          error?: string | null
          external_id?: string | null
          id?: string
          payload?: Json | null
          source: Database["public"]["Enums"]["contact_source"]
          status?: Database["public"]["Enums"]["sync_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          app_contact_id?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["sync_direction"]
          error?: string | null
          external_id?: string | null
          id?: string
          payload?: Json | null
          source?: Database["public"]["Enums"]["contact_source"]
          status?: Database["public"]["Enums"]["sync_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_app_contact_id_fkey"
            columns: ["app_contact_id"]
            isOneToOne: false
            referencedRelation: "app_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          apple_contacts_permission:
            | Database["public"]["Enums"]["contacts_permission"]
            | null
          apple_sync_enabled: boolean
          apple_visible: boolean
          conflict_preference:
            | Database["public"]["Enums"]["conflict_resolution_preference"]
            | null
          created_at: string
          google_access_token: string | null
          google_refresh_token: string | null
          google_sync_enabled: boolean
          google_sync_token: string | null
          google_token_expiry: string | null
          google_visible: boolean
          id: string
          last_sync_apple: string | null
          last_sync_google: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_contacts_permission?:
            | Database["public"]["Enums"]["contacts_permission"]
            | null
          apple_sync_enabled?: boolean
          apple_visible?: boolean
          conflict_preference?:
            | Database["public"]["Enums"]["conflict_resolution_preference"]
            | null
          created_at?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_sync_enabled?: boolean
          google_sync_token?: string | null
          google_token_expiry?: string | null
          google_visible?: boolean
          id?: string
          last_sync_apple?: string | null
          last_sync_google?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_contacts_permission?:
            | Database["public"]["Enums"]["contacts_permission"]
            | null
          apple_sync_enabled?: boolean
          apple_visible?: boolean
          conflict_preference?:
            | Database["public"]["Enums"]["conflict_resolution_preference"]
            | null
          created_at?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_sync_enabled?: boolean
          google_sync_token?: string | null
          google_token_expiry?: string | null
          google_visible?: boolean
          id?: string
          last_sync_apple?: string | null
          last_sync_google?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          apple_sub: string | null
          created_at: string
          email: string | null
          google_sub: string | null
          id: string
          name: string | null
          notifications_enabled: boolean | null
          reminder_days: Json | null
          reminder_time_local: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_sub?: string | null
          created_at?: string
          email?: string | null
          google_sub?: string | null
          id?: string
          name?: string | null
          notifications_enabled?: boolean | null
          reminder_days?: Json | null
          reminder_time_local?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_sub?: string | null
          created_at?: string
          email?: string | null
          google_sub?: string | null
          id?: string
          name?: string | null
          notifications_enabled?: boolean | null
          reminder_days?: Json | null
          reminder_time_local?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_completion_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
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
      get_user_tier: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
    }
    Enums: {
      conflict_resolution_preference: "apple" | "google" | "ask"
      contact_source: "apple" | "google" | "app"
      contacts_permission: "unknown" | "granted" | "denied"
      subscription_tier: "free" | "pro" | "business"
      sync_direction: "pull" | "push"
      sync_status: "pending" | "processing" | "success" | "failed"
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
      conflict_resolution_preference: ["apple", "google", "ask"],
      contact_source: ["apple", "google", "app"],
      contacts_permission: ["unknown", "granted", "denied"],
      subscription_tier: ["free", "pro", "business"],
      sync_direction: ["pull", "push"],
      sync_status: ["pending", "processing", "success", "failed"],
    },
  },
} as const
