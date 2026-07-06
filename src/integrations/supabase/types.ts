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
      open_order_gigs: {
        Row: {
          created_at: string
          delivery_fee: number
          distance_miles: number
          item_count: number
          items_total: number
          order_id: string
          platform_fee: number
          status: Database["public"]["Enums"]["order_status"]
          store_emoji: string
          store_lat: number | null
          store_lng: number | null
          store_name: string
          store_tag: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at: string
          delivery_fee?: number
          distance_miles?: number
          item_count?: number
          items_total?: number
          order_id: string
          platform_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_emoji?: string
          store_lat?: number | null
          store_lng?: number | null
          store_name: string
          store_tag?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          distance_miles?: number
          item_count?: number
          items_total?: number
          order_id?: string
          platform_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_emoji?: string
          store_lat?: number | null
          store_lng?: number | null
          store_name?: string
          store_tag?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          distance_miles: number
          id: string
          items: Json
          items_total: number
          neighbor_id: string
          neighbor_label: string
          neighbor_lat: number | null
          neighbor_lng: number | null
          notes: string
          platform_fee: number
          rider_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_emoji: string
          store_lat: number | null
          store_lng: number | null
          store_name: string
          store_tag: string
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          distance_miles?: number
          id?: string
          items?: Json
          items_total?: number
          neighbor_id: string
          neighbor_label?: string
          neighbor_lat?: number | null
          neighbor_lng?: number | null
          notes?: string
          platform_fee?: number
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_emoji?: string
          store_lat?: number | null
          store_lng?: number | null
          store_name: string
          store_tag?: string
          total?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          distance_miles?: number
          id?: string
          items?: Json
          items_total?: number
          neighbor_id?: string
          neighbor_label?: string
          neighbor_lat?: number | null
          neighbor_lng?: number | null
          notes?: string
          platform_fee?: number
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_emoji?: string
          store_lat?: number | null
          store_lng?: number | null
          store_name?: string
          store_tag?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string
          city: string
          created_at: string
          display_name: string
          home_address: string
          home_lat: number | null
          home_lng: number | null
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string
          city?: string
          created_at?: string
          display_name?: string
          home_address?: string
          home_lat?: number | null
          home_lng?: number | null
          id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string
          city?: string
          created_at?: string
          display_name?: string
          home_address?: string
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      rider_applications: {
        Row: {
          admin_notes: string
          agreed_to_terms: boolean
          bike_type: string
          created_at: string
          date_of_birth: string
          id: string
          id_photo_path: string
          legal_name: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["rider_app_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string
          agreed_to_terms?: boolean
          bike_type?: string
          created_at?: string
          date_of_birth: string
          id?: string
          id_photo_path?: string
          legal_name: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["rider_app_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string
          agreed_to_terms?: boolean
          bike_type?: string
          created_at?: string
          date_of_birth?: string
          id?: string
          id_photo_path?: string
          legal_name?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["rider_app_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_items: {
        Row: {
          category: string
          created_at: string
          emoji: string
          id: string
          in_stock: boolean
          name: string
          price: number
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          in_stock?: boolean
          name: string
          price?: number
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          in_stock?: boolean
          name?: string
          price?: number
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          address: string
          city: string
          created_at: string
          emoji: string
          hours: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          sort_order: number
          tag: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string
          city?: string
          created_at?: string
          emoji?: string
          hours?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          sort_order?: number
          tag?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          city?: string
          created_at?: string
          emoji?: string
          hours?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          sort_order?: number
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "rider" | "neighbor"
      order_status:
        | "open"
        | "accepted"
        | "picked_up"
        | "delivered"
        | "cancelled"
      rider_app_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "rider", "neighbor"],
      order_status: ["open", "accepted", "picked_up", "delivered", "cancelled"],
      rider_app_status: ["pending", "approved", "rejected"],
    },
  },
} as const
