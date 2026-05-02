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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_user_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          deliverable_deadline: string | null
          id: string
          influencer_id: string
          invitation_id: string | null
          notes: string | null
          offer_id: string | null
          scheduled_date: string
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          deliverable_deadline?: string | null
          id?: string
          influencer_id: string
          invitation_id?: string | null
          notes?: string | null
          offer_id?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          deliverable_deadline?: string | null
          id?: string
          influencer_id?: string
          invitation_id?: string | null
          notes?: string | null
          offer_id?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          booking_id: string
          caption: string | null
          content_type: string
          content_url: string | null
          created_at: string
          feedback: string | null
          id: string
          influencer_id: string
          platform: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          caption?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          influencer_id: string
          platform?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          caption?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          influencer_id?: string
          platform?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          booking_id: string | null
          commission: number
          created_at: string
          description: string | null
          id: string
          influencer_id: string
          net_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          commission?: number
          created_at?: string
          description?: string | null
          id?: string
          influencer_id: string
          net_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          commission?: number
          created_at?: string
          description?: string | null
          id?: string
          influencer_id?: string
          net_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          current_attendees: number
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          max_attendees: number | null
          starts_at: string
          title: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          current_attendees?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_attendees?: number | null
          starts_at: string
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          current_attendees?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_attendees?: number | null
          starts_at?: string
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_settings: {
        Row: {
          created_at: string
          id: string
          influencer_id: string
          language: string
          niches: string[] | null
          notification_earnings: boolean
          notification_invitations: boolean
          notification_messages: boolean
          notification_promotions: boolean
          privacy_show_earnings: boolean
          privacy_show_profile: boolean
          subscription_plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_id: string
          language?: string
          niches?: string[] | null
          notification_earnings?: boolean
          notification_invitations?: boolean
          notification_messages?: boolean
          notification_promotions?: boolean
          privacy_show_earnings?: boolean
          privacy_show_profile?: boolean
          subscription_plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          influencer_id?: string
          language?: string
          niches?: string[] | null
          notification_earnings?: boolean
          notification_invitations?: boolean
          notification_messages?: boolean
          notification_promotions?: boolean
          privacy_show_earnings?: boolean
          privacy_show_profile?: boolean
          subscription_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      influencer_warnings: {
        Row: {
          created_at: string
          id: string
          influencer_id: string
          is_read: boolean
          issued_by: string
          warning_message: string
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_id: string
          is_read?: boolean
          issued_by: string
          warning_message: string
        }
        Update: {
          created_at?: string
          id?: string
          influencer_id?: string
          is_read?: boolean
          issued_by?: string
          warning_message?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          influencer_id: string
          message: string | null
          offer_id: string | null
          qr_code: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          influencer_id: string
          message?: string | null
          offer_id?: string | null
          qr_code?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          influencer_id?: string
          message?: string | null
          offer_id?: string | null
          qr_code?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      media_kits: {
        Row: {
          audience_demographics: Json | null
          avg_likes: number | null
          avg_views: number | null
          brands_worked_with: string[] | null
          created_at: string
          engagement_rate: number | null
          id: string
          influencer_id: string
          pdf_url: string | null
          portfolio_urls: string[] | null
          tagline: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          audience_demographics?: Json | null
          avg_likes?: number | null
          avg_views?: number | null
          brands_worked_with?: string[] | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          influencer_id: string
          pdf_url?: string | null
          portfolio_urls?: string[] | null
          tagline?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          audience_demographics?: Json | null
          avg_likes?: number | null
          avg_views?: number | null
          brands_worked_with?: string[] | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          influencer_id?: string
          pdf_url?: string | null
          portfolio_urls?: string[] | null
          tagline?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean
          media_url: string | null
          message_type: string
          receiver_id: string
          sender_id: string
          venue_id: string | null
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_url?: string | null
          message_type?: string
          receiver_id: string
          sender_id: string
          venue_id?: string | null
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_url?: string | null
          message_type?: string
          receiver_id?: string
          sender_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_redemptions: {
        Row: {
          created_at: string
          id: string
          influencer_id: string
          offer_id: string
          qr_code: string | null
          qr_expires_at: string | null
          qr_used_at: string | null
          redeemed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_id: string
          offer_id: string
          qr_code?: string | null
          qr_expires_at?: string | null
          qr_used_at?: string | null
          redeemed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          influencer_id?: string
          offer_id?: string
          qr_code?: string | null
          qr_expires_at?: string | null
          qr_used_at?: string | null
          redeemed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_redemptions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          cover_image_url: string | null
          created_at: string
          current_redemptions: number
          description: string | null
          discount_value: number | null
          ends_at: string | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          max_redemptions: number | null
          min_followers: number | null
          offer_type: string
          requirements: string | null
          starts_at: string
          title: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          current_redemptions?: number
          description?: string | null
          discount_value?: number | null
          ends_at?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_redemptions?: number | null
          min_followers?: number | null
          offer_type?: string
          requirements?: string | null
          starts_at?: string
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          current_redemptions?: number
          description?: string | null
          discount_value?: number | null
          ends_at?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_redemptions?: number | null
          min_followers?: number | null
          offer_type?: string
          requirements?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          audience_demographics: Json | null
          avatar_url: string | null
          badge: string | null
          bio: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          engagement_rate: number | null
          followers_count: number | null
          full_name: string | null
          id: string
          influencer_score: number | null
          instagram_handle: string | null
          is_suspended: boolean
          is_verified: boolean
          niche: string[] | null
          phone: string | null
          social_links: Json | null
          tiktok_followers: number | null
          tiktok_handle: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_demographics?: Json | null
          avatar_url?: string | null
          badge?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          engagement_rate?: number | null
          followers_count?: number | null
          full_name?: string | null
          id?: string
          influencer_score?: number | null
          instagram_handle?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          niche?: string[] | null
          phone?: string | null
          social_links?: Json | null
          tiktok_followers?: number | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_demographics?: Json | null
          avatar_url?: string | null
          badge?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          engagement_rate?: number | null
          followers_count?: number | null
          full_name?: string | null
          id?: string
          influencer_score?: number | null
          instagram_handle?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          niche?: string[] | null
          phone?: string | null
          social_links?: Json | null
          tiktok_followers?: number | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_note: string | null
          booking_id: string | null
          created_at: string
          id: string
          is_hidden: boolean
          is_public: boolean
          rating: number
          review_text: string | null
          review_type: string
          reviewed_id: string
          reviewer_id: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          admin_note?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_public?: boolean
          rating: number
          review_text?: string | null
          review_type: string
          reviewed_id: string
          reviewer_id: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          admin_note?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_public?: boolean
          rating?: number
          review_text?: string | null
          review_type?: string
          reviewed_id?: string
          reviewer_id?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_points: {
        Row: {
          created_at: string
          id: string
          points: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_locations: {
        Row: {
          city: string
          country: string | null
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          city: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          city?: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          commission_pct: number
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          commission_pct?: number
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          commission_pct?: number
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
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
      venues: {
        Row: {
          address: string | null
          approval_status: string
          category: string
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string
          category?: string
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string
          category?: string
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          influencer_id: string
          notes: string | null
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          influencer_id: string
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          influencer_id?: string
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          badge: string
          full_name: string
          influencer_score: number
          points: number
          user_id: string
        }[]
      }
      get_wallet_balance: { Args: { _user_id: string }; Returns: number }
      has_admin_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_venue_owner: { Args: { _venue_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "venue" | "influencer"
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
      app_role: ["admin", "venue", "influencer"],
    },
  },
} as const
