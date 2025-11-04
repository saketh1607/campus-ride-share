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
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          ride_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          ride_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          ride_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_details: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          confirmation_letter_url: string
          created_at: string | null
          id: string
          license_number: string
          license_photo_url: string
          parent_phone_number: string
          updated_at: string | null
          user_id: string
          vehicle_model: string | null
          vehicle_number: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          confirmation_letter_url: string
          created_at?: string | null
          id?: string
          license_number: string
          license_photo_url: string
          parent_phone_number: string
          updated_at?: string | null
          user_id: string
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          confirmation_letter_url?: string
          created_at?: string | null
          id?: string
          license_number?: string
          license_photo_url?: string
          parent_phone_number?: string
          updated_at?: string | null
          user_id?: string
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_impact: {
        Row: {
          carbon_reduced_kg: number
          created_at: string | null
          distance_shared_km: number
          fuel_saved_liters: number
          id: string
          ride_id: string | null
          user_id: string
        }
        Insert: {
          carbon_reduced_kg: number
          created_at?: string | null
          distance_shared_km: number
          fuel_saved_liters: number
          id?: string
          ride_id?: string | null
          user_id: string
        }
        Update: {
          carbon_reduced_kg?: number
          created_at?: string | null
          distance_shared_km?: number
          fuel_saved_liters?: number
          id?: string
          ride_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_impact_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_impact_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          created_at: string | null
          current_year: number | null
          email: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_driver: boolean | null
          parent_phone_number: string | null
          phone_number: string | null
          photo_url: string | null
          primary_location_address: string | null
          primary_location_lat: number | null
          primary_location_lng: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          created_at?: string | null
          current_year?: number | null
          email: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          is_driver?: boolean | null
          parent_phone_number?: string | null
          phone_number?: string | null
          photo_url?: string | null
          primary_location_address?: string | null
          primary_location_lat?: number | null
          primary_location_lng?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          created_at?: string | null
          current_year?: number | null
          email?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_driver?: boolean | null
          parent_phone_number?: string | null
          phone_number?: string | null
          photo_url?: string | null
          primary_location_address?: string | null
          primary_location_lat?: number | null
          primary_location_lng?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
      ride_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          passenger_id: string
          rating: number
          report: string | null
          ride_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          passenger_id: string
          rating: number
          report?: string | null
          ride_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          passenger_id?: string
          rating?: number
          report?: string | null
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_feedback_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_feedback_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_preferences: {
        Row: {
          accept_opposite_gender: boolean | null
          accept_seniors: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accept_opposite_gender?: boolean | null
          accept_seniors?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accept_opposite_gender?: boolean | null
          accept_seniors?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          created_at: string | null
          distance_km: number | null
          fare_amount: number | null
          id: string
          otp: string | null
          passenger_id: string
          payment_intent_id: string | null
          payment_status: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          ride_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          fare_amount?: number | null
          id?: string
          otp?: string | null
          passenger_id: string
          payment_intent_id?: string | null
          payment_status?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          ride_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          fare_amount?: number | null
          id?: string
          otp?: string | null
          passenger_id?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          ride_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          available_seats: number
          created_at: string | null
          driver_id: string
          end_address: string
          end_lat: number
          end_lng: number
          id: string
          is_recurring: boolean | null
          recurrence_days: string[] | null
          route_geometry: string | null
          scheduled_time: string
          start_address: string
          start_lat: number
          start_lng: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          available_seats?: number
          created_at?: string | null
          driver_id: string
          end_address: string
          end_lat: number
          end_lng: number
          id?: string
          is_recurring?: boolean | null
          recurrence_days?: string[] | null
          route_geometry?: string | null
          scheduled_time: string
          start_address: string
          start_lat: number
          start_lng: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          available_seats?: number
          created_at?: string | null
          driver_id?: string
          end_address?: string
          end_lat?: number
          end_lng?: number
          id?: string
          is_recurring?: boolean | null
          recurrence_days?: string[] | null
          route_geometry?: string | null
          scheduled_time?: string
          start_address?: string
          start_lat?: number
          start_lng?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      driver_ratings: {
        Row: {
          average_rating: number | null
          driver_id: string | null
          total_ratings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_role: "admin" | "student" | "staff"
      approval_status: "pending" | "approved" | "rejected"
      gender: "male" | "female" | "other" | "prefer_not_to_say"
      user_type: "student" | "faculty"
      vehicle_type: "two_wheeler" | "four_wheeler"
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
      app_role: ["admin", "student", "staff"],
      approval_status: ["pending", "approved", "rejected"],
      gender: ["male", "female", "other", "prefer_not_to_say"],
      user_type: ["student", "faculty"],
      vehicle_type: ["two_wheeler", "four_wheeler"],
    },
  },
} as const
