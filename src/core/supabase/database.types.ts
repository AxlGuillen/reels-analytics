// Generado por Supabase (proyecto Axl-Projects). Regenerar tras cada migración:
//   bunx supabase gen types typescript --project-id impscwgourdxhdejwkhe > src/core/supabase/database.types.ts
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
      ra_account_snapshots: {
        Row: {
          account_id: string
          captured_at: string
          followers: number | null
          following: number | null
          id: number
          total_likes: number | null
          total_views: number | null
          video_count: number | null
        }
        Insert: {
          account_id: string
          captured_at?: string
          followers?: number | null
          following?: number | null
          id?: never
          total_likes?: number | null
          total_views?: number | null
          video_count?: number | null
        }
        Update: {
          account_id?: string
          captured_at?: string
          followers?: number | null
          following?: number | null
          id?: never
          total_likes?: number | null
          total_views?: number | null
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ra_account_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ra_social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ra_connections: {
        Row: {
          access_token: string
          account_id: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_expires_at: string | null
          refresh_token: string | null
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          account_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_expires_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_expires_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ra_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "ra_social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ra_social_accounts: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          external_id: string
          handle: string | null
          id: string
          platform: Database["public"]["Enums"]["ra_platform"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          external_id: string
          handle?: string | null
          id?: string
          platform: Database["public"]["Enums"]["ra_platform"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          external_id?: string
          handle?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["ra_platform"]
          updated_at?: string
        }
        Relationships: []
      }
      ra_video_snapshots: {
        Row: {
          captured_at: string
          comments: number
          id: number
          likes: number
          saved: number | null
          shares: number
          video_id: string
          views: number
        }
        Insert: {
          captured_at?: string
          comments: number
          id?: never
          likes: number
          saved?: number | null
          shares: number
          video_id: string
          views: number
        }
        Update: {
          captured_at?: string
          comments?: number
          id?: never
          likes?: number
          saved?: number | null
          shares?: number
          video_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "ra_video_snapshots_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "ra_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      ra_videos: {
        Row: {
          account_id: string
          caption: string | null
          created_at: string
          duration_s: number | null
          external_id: string
          hashtags: string[]
          id: string
          platform: Database["public"]["Enums"]["ra_platform"]
          published_at: string
          thumbnail_url: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          account_id: string
          caption?: string | null
          created_at?: string
          duration_s?: number | null
          external_id: string
          hashtags?: string[]
          id?: string
          platform: Database["public"]["Enums"]["ra_platform"]
          published_at: string
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          account_id?: string
          caption?: string | null
          created_at?: string
          duration_s?: number | null
          external_id?: string
          hashtags?: string[]
          id?: string
          platform?: Database["public"]["Enums"]["ra_platform"]
          published_at?: string
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ra_videos_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ra_social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ra_platform: "tiktok" | "instagram"
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
      ra_platform: ["tiktok", "instagram"],
    },
  },
} as const
