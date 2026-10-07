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
      booking_checkin_codes: {
        Row: {
          code: string
          created_at: string
          redemption_id: string
        }
        Insert: {
          code: string
          created_at?: string
          redemption_id: string
        }
        Update: {
          code?: string
          created_at?: string
          redemption_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_checkin_codes_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: true
            referencedRelation: "offer_redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_platform_integrations: {
        Row: {
          config: Json | null
          connected_at: string | null
          created_at: string
          id: string
          platform: string
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          id?: string
          platform: string
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          id?: string
          platform?: string
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_platform_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "booking_platform_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "booking_platform_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
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
          preferred_date: string | null
          redemption_id: string | null
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
          preferred_date?: string | null
          redemption_id?: string | null
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
          preferred_date?: string | null
          redemption_id?: string | null
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
            foreignKeyName: "bookings_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "offer_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
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
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_matches: {
        Row: {
          brief_id: string
          created_at: string
          id: string
          influencer_id: string
          invited: boolean
          reasoning: string | null
          score: number
        }
        Insert: {
          brief_id: string
          created_at?: string
          id?: string
          influencer_id: string
          invited?: boolean
          reasoning?: string | null
          score?: number
        }
        Update: {
          brief_id?: string
          created_at?: string
          id?: string
          influencer_id?: string
          invited?: boolean
          reasoning?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "brief_matches_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "venue_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          age_limit: number | null
          age_restricted: boolean | null
          allow_post_or_reel: boolean | null
          approval_criteria: Json
          approval_type: string | null
          auto_approve_top: boolean | null
          availability_type: string | null
          available_days: string[] | null
          booking_limit_count: number | null
          booking_limits: boolean | null
          content_focus: string | null
          cover_image_url: string | null
          cover_images: string[] | null
          cover_video_url: string | null
          created_at: string
          deliverables: Json | null
          description: string | null
          dietary_options: string[] | null
          end_date: string | null
          event_datetime: string | null
          fulfilment_type: string
          handles: string[] | null
          id: string
          instagram_offers: Json | null
          invite_only: boolean | null
          is_draft: boolean | null
          location_id: string | null
          post_min_photo_count: number | null
          reel_min_duration_seconds: number | null
          require_phone: boolean | null
          required_days_notice: number | null
          scheduled_time_slots: string[] | null
          start_date: string | null
          status: string
          tiktok_offers: Json | null
          title: string
          updated_at: string
          venue_id: string
          visible_before_start: boolean | null
        }
        Insert: {
          age_limit?: number | null
          age_restricted?: boolean | null
          allow_post_or_reel?: boolean | null
          approval_criteria?: Json
          approval_type?: string | null
          auto_approve_top?: boolean | null
          availability_type?: string | null
          available_days?: string[] | null
          booking_limit_count?: number | null
          booking_limits?: boolean | null
          content_focus?: string | null
          cover_image_url?: string | null
          cover_images?: string[] | null
          cover_video_url?: string | null
          created_at?: string
          deliverables?: Json | null
          description?: string | null
          dietary_options?: string[] | null
          end_date?: string | null
          event_datetime?: string | null
          fulfilment_type?: string
          handles?: string[] | null
          id?: string
          instagram_offers?: Json | null
          invite_only?: boolean | null
          is_draft?: boolean | null
          location_id?: string | null
          post_min_photo_count?: number | null
          reel_min_duration_seconds?: number | null
          require_phone?: boolean | null
          required_days_notice?: number | null
          scheduled_time_slots?: string[] | null
          start_date?: string | null
          status?: string
          tiktok_offers?: Json | null
          title: string
          updated_at?: string
          venue_id: string
          visible_before_start?: boolean | null
        }
        Update: {
          age_limit?: number | null
          age_restricted?: boolean | null
          allow_post_or_reel?: boolean | null
          approval_criteria?: Json
          approval_type?: string | null
          auto_approve_top?: boolean | null
          availability_type?: string | null
          available_days?: string[] | null
          booking_limit_count?: number | null
          booking_limits?: boolean | null
          content_focus?: string | null
          cover_image_url?: string | null
          cover_images?: string[] | null
          cover_video_url?: string | null
          created_at?: string
          deliverables?: Json | null
          description?: string | null
          dietary_options?: string[] | null
          end_date?: string | null
          event_datetime?: string | null
          fulfilment_type?: string
          handles?: string[] | null
          id?: string
          instagram_offers?: Json | null
          invite_only?: boolean | null
          is_draft?: boolean | null
          location_id?: string | null
          post_min_photo_count?: number | null
          reel_min_duration_seconds?: number | null
          require_phone?: boolean | null
          required_days_notice?: number | null
          scheduled_time_slots?: string[] | null
          start_date?: string | null
          status?: string
          tiktok_offers?: Json | null
          title?: string
          updated_at?: string
          venue_id?: string
          visible_before_start?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "campaigns_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "campaigns_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      chatbot_knowledge: {
        Row: {
          answer: string | null
          category: string | null
          created_at: string
          created_by: string | null
          doc_content: string | null
          doc_title: string | null
          entry_type: string
          id: string
          is_active: boolean
          question: string | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          doc_content?: string | null
          doc_title?: string | null
          entry_type?: string
          id?: string
          is_active?: boolean
          question?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          doc_content?: string | null
          doc_title?: string | null
          entry_type?: string
          id?: string
          is_active?: boolean
          question?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checkin_attempts: {
        Row: {
          code: string | null
          created_at: string
          id: string
          manual: boolean
          ok: boolean
          reason: string | null
          redemption_id: string | null
          scanned_by: string | null
          venue_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          manual?: boolean
          ok: boolean
          reason?: string | null
          redemption_id?: string | null
          scanned_by?: string | null
          venue_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          manual?: boolean
          ok?: boolean
          reason?: string | null
          redemption_id?: string | null
          scanned_by?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_attempts_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "offer_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_attempts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "checkin_attempts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "checkin_attempts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_prospects: {
        Row: {
          area: string | null
          created_at: string
          followers: number | null
          full_name: string
          id: string
          instagram_handle: string | null
          lost_reason: string | null
          next_action: string | null
          next_action_date: string | null
          niche: string | null
          notes: string | null
          owner_id: string
          source: string
          stage: string
          stage_changed_at: string
          tiktok_handle: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          followers?: number | null
          full_name: string
          id?: string
          instagram_handle?: string | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          niche?: string | null
          notes?: string | null
          owner_id: string
          source?: string
          stage?: string
          stage_changed_at?: string
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          followers?: number | null
          full_name?: string
          id?: string
          instagram_handle?: string | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          niche?: string | null
          notes?: string | null
          owner_id?: string
          source?: string
          stage?: string
          stage_changed_at?: string
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      creator_strikes: {
        Row: {
          created_at: string
          id: string
          influencer_id: string
          reason: string
          redemption_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_id: string
          reason: string
          redemption_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          influencer_id?: string
          reason?: string
          redemption_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_strikes_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: true
            referencedRelation: "offer_redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_events: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          end_date: string
          has_notification: boolean
          id: string
          region: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          end_date: string
          has_notification?: boolean
          id?: string
          region?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          end_date?: string
          has_notification?: boolean
          id?: string
          region?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          booking_id: string
          caption: string | null
          comments: number
          content_quality_rating: number | null
          content_rated_at: string | null
          content_rated_by: string | null
          content_type: string
          content_url: string | null
          created_at: string
          dispute_reason: string | null
          disputed: boolean
          disputed_at: string | null
          disputed_by: string | null
          external_post_id: string | null
          feedback: string | null
          id: string
          influencer_id: string
          likes: number
          media_url: string | null
          metrics_updated_at: string | null
          platform: string | null
          post_url: string | null
          posted_at: string | null
          rejection_note: string | null
          reviewed_at: string | null
          saves: number
          shares: number
          status: string
          submitted_at: string | null
          thumbnail_url: string | null
          updated_at: string
          views: number
        }
        Insert: {
          booking_id: string
          caption?: string | null
          comments?: number
          content_quality_rating?: number | null
          content_rated_at?: string | null
          content_rated_by?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          dispute_reason?: string | null
          disputed?: boolean
          disputed_at?: string | null
          disputed_by?: string | null
          external_post_id?: string | null
          feedback?: string | null
          id?: string
          influencer_id: string
          likes?: number
          media_url?: string | null
          metrics_updated_at?: string | null
          platform?: string | null
          post_url?: string | null
          posted_at?: string | null
          rejection_note?: string | null
          reviewed_at?: string | null
          saves?: number
          shares?: number
          status?: string
          submitted_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          booking_id?: string
          caption?: string | null
          comments?: number
          content_quality_rating?: number | null
          content_rated_at?: string | null
          content_rated_by?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          dispute_reason?: string | null
          disputed?: boolean
          disputed_at?: string | null
          disputed_by?: string | null
          external_post_id?: string | null
          feedback?: string | null
          id?: string
          influencer_id?: string
          likes?: number
          media_url?: string | null
          metrics_updated_at?: string | null
          platform?: string | null
          post_url?: string | null
          posted_at?: string | null
          rejection_note?: string | null
          reviewed_at?: string | null
          saves?: number
          shares?: number
          status?: string
          submitted_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          views?: number
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
      event_attendees: {
        Row: {
          checked_in_at: string | null
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
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
          brief_id: string | null
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
          brief_id?: string | null
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
          brief_id?: string | null
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
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "invitations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
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
      lead_activities: {
        Row: {
          created_at: string
          happened_at: string
          id: string
          lead_id: string
          note: string | null
          outcome: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          happened_at?: string
          id?: string
          lead_id: string
          note?: string | null
          outcome?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          happened_at?: string
          id?: string
          lead_id?: string
          note?: string | null
          outcome?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          area: string | null
          category: string | null
          city: string | null
          contact_name: string
          contact_role: string | null
          country: string | null
          created_at: string
          google_rating: number | null
          google_review_count: number | null
          id: string
          instagram_followers: number | null
          instagram_handle: string | null
          lost_reason: string | null
          maps_place_id: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          owner_id: string
          phone: string
          plan_pitched_id: string | null
          price_level: number | null
          source: string
          stage: string
          stage_changed_at: string
          updated_at: string
          venue_id: string | null
          venue_name: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          category?: string | null
          city?: string | null
          contact_name: string
          contact_role?: string | null
          country?: string | null
          created_at?: string
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          instagram_followers?: number | null
          instagram_handle?: string | null
          lost_reason?: string | null
          maps_place_id?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          owner_id: string
          phone: string
          plan_pitched_id?: string | null
          price_level?: number | null
          source?: string
          stage?: string
          stage_changed_at?: string
          updated_at?: string
          venue_id?: string | null
          venue_name: string
        }
        Update: {
          address?: string | null
          area?: string | null
          category?: string | null
          city?: string | null
          contact_name?: string
          contact_role?: string | null
          country?: string | null
          created_at?: string
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          instagram_followers?: number | null
          instagram_handle?: string | null
          lost_reason?: string | null
          maps_place_id?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string
          plan_pitched_id?: string | null
          price_level?: number | null
          source?: string
          stage?: string
          stage_changed_at?: string
          updated_at?: string
          venue_id?: string | null
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_plan_pitched_id_fkey"
            columns: ["plan_pitched_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "leads_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "leads_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      login_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "messages_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
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
      niches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      offer_redemptions: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checkin_lat: number | null
          checkin_lng: number | null
          created_at: string
          delivery_stage: string | null
          failure_reason: string | null
          id: string
          influencer_id: string
          manual_checkin_reason: string | null
          offer_id: string
          post_check_due_at: string | null
          post_due_at: string | null
          post_url: string | null
          posted_at: string | null
          posted_late: boolean
          preferred_date: string | null
          qr_code: string | null
          qr_expires_at: string | null
          qr_token: string | null
          qr_used_at: string | null
          received_at: string | null
          redeemed_at: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_phone: string | null
          status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          created_at?: string
          delivery_stage?: string | null
          failure_reason?: string | null
          id?: string
          influencer_id: string
          manual_checkin_reason?: string | null
          offer_id: string
          post_check_due_at?: string | null
          post_due_at?: string | null
          post_url?: string | null
          posted_at?: string | null
          posted_late?: boolean
          preferred_date?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          qr_token?: string | null
          qr_used_at?: string | null
          received_at?: string | null
          redeemed_at?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          created_at?: string
          delivery_stage?: string | null
          failure_reason?: string | null
          id?: string
          influencer_id?: string
          manual_checkin_reason?: string | null
          offer_id?: string
          post_check_due_at?: string | null
          post_due_at?: string | null
          post_url?: string | null
          posted_at?: string | null
          posted_late?: boolean
          preferred_date?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          qr_token?: string | null
          qr_used_at?: string | null
          received_at?: string | null
          redeemed_at?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          verified_at?: string | null
          verified_by?: string | null
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
      offer_views: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_views_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          available_days: string[] | null
          campaign_id: string | null
          category: string | null
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          current_redemptions: number
          description: string | null
          discount_value: number | null
          ends_at: string | null
          event_date: string | null
          event_time: string | null
          fulfilment_type: string
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          max_redemptions: number | null
          media_type: string | null
          media_url: string | null
          min_engagement_rate: number | null
          min_followers: number | null
          offer_type: string
          platforms: string[] | null
          post_min_photo_count: number | null
          reel_min_duration_seconds: number | null
          requirements: string | null
          starts_at: string
          title: string
          updated_at: string
          value_worth: string | null
          venue_id: string
        }
        Insert: {
          available_days?: string[] | null
          campaign_id?: string | null
          category?: string | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_redemptions?: number
          description?: string | null
          discount_value?: number | null
          ends_at?: string | null
          event_date?: string | null
          event_time?: string | null
          fulfilment_type?: string
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_redemptions?: number | null
          media_type?: string | null
          media_url?: string | null
          min_engagement_rate?: number | null
          min_followers?: number | null
          offer_type?: string
          platforms?: string[] | null
          post_min_photo_count?: number | null
          reel_min_duration_seconds?: number | null
          requirements?: string | null
          starts_at?: string
          title: string
          updated_at?: string
          value_worth?: string | null
          venue_id: string
        }
        Update: {
          available_days?: string[] | null
          campaign_id?: string | null
          category?: string | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_redemptions?: number
          description?: string | null
          discount_value?: number | null
          ends_at?: string | null
          event_date?: string | null
          event_time?: string | null
          fulfilment_type?: string
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_redemptions?: number | null
          media_type?: string | null
          media_url?: string | null
          min_engagement_rate?: number | null
          min_followers?: number | null
          offer_type?: string
          platforms?: string[] | null
          post_min_photo_count?: number | null
          reel_min_duration_seconds?: number | null
          requirements?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
          value_worth?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "offers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "offers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string | null
          created_at: string
          id: string
          legal_name: string | null
          name: string
          owner_id: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          name: string
          owner_id: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          name?: string
          owner_id?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_instagram_signups: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          ig_account_type: string | null
          ig_user_id: string
          ig_username: string | null
          scope: string | null
          token_expires_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string
          id?: string
          ig_account_type?: string | null
          ig_user_id: string
          ig_username?: string | null
          scope?: string | null
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          ig_account_type?: string | null
          ig_user_id?: string
          ig_username?: string | null
          scope?: string | null
          token_expires_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          approval_status: string
          approved_at: string | null
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
          instagram_verified: boolean | null
          instagram_verified_at: string | null
          is_suspended: boolean
          is_verified: boolean
          niche: string[] | null
          phone: string | null
          social_links: Json | null
          suspended_until: string | null
          tiktok_followers: number | null
          tiktok_handle: string | null
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: string
          approved_at?: string | null
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
          instagram_verified?: boolean | null
          instagram_verified_at?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          niche?: string[] | null
          phone?: string | null
          social_links?: Json | null
          suspended_until?: string | null
          tiktok_followers?: number | null
          tiktok_handle?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approval_status?: string
          approved_at?: string | null
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
          instagram_verified?: boolean | null
          instagram_verified_at?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          niche?: string[] | null
          phone?: string | null
          social_links?: Json | null
          suspended_until?: string | null
          tiktok_followers?: number | null
          tiktok_handle?: string | null
          two_factor_enabled?: boolean
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
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
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
      sales_audit_log: {
        Row: {
          action: string
          created_at: string
          detail: Json
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sales_territories: {
        Row: {
          area: string
          country: string | null
          rep_id: string
          updated_at: string
        }
        Insert: {
          area: string
          country?: string | null
          rep_id: string
          updated_at?: string
        }
        Update: {
          area?: string
          country?: string | null
          rep_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_offers: {
        Row: {
          created_at: string
          id: string
          influencer_id: string
          offer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_id: string
          offer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          influencer_id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_locations: {
        Row: {
          area: string | null
          city: string
          country: string | null
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          area?: string | null
          city: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          area?: string | null
          city?: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      social_integrations: {
        Row: {
          access_token: string | null
          avatar_url: string | null
          connected_at: string
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          influencer_id: string | null
          open_id: string | null
          platform: string
          refresh_token: string | null
          scope: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          access_token?: string | null
          avatar_url?: string | null
          connected_at?: string
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          influencer_id?: string | null
          open_id?: string | null
          platform: string
          refresh_token?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          access_token?: string | null
          avatar_url?: string | null
          connected_at?: string
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          influencer_id?: string | null
          open_id?: string | null
          platform?: string
          refresh_token?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "social_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_audit_log: {
        Row: {
          action: string
          created_at: string
          detail: Json
          id: string
          target_id: string | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json
          id?: string
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json
          id?: string
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          area: string
          level: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          area: string
          level: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          area?: string
          level?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      venue_briefs: {
        Row: {
          budget: number | null
          category: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          deadline: string | null
          deliverables: string | null
          deliverables_spec: Json
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          location_id: string | null
          max_followers: number | null
          min_followers: number | null
          niches: string[] | null
          pipeline_stage: string
          requirements: string | null
          status: string
          title: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          budget?: number | null
          category?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          deadline?: string | null
          deliverables?: string | null
          deliverables_spec?: Json
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_id?: string | null
          max_followers?: number | null
          min_followers?: number | null
          niches?: string[] | null
          pipeline_stage?: string
          requirements?: string | null
          status?: string
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          budget?: number | null
          category?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          deadline?: string | null
          deliverables?: string | null
          deliverables_spec?: Json
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_id?: string | null
          max_followers?: number | null
          min_followers?: number | null
          niches?: string[] | null
          pipeline_stage?: string
          requirements?: string | null
          status?: string
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_briefs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_briefs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_briefs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          is_primary: boolean
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string
          venue_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string
          venue_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string
          venue_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_locations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_locations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_locations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_message_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_message_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_message_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_photos: {
        Row: {
          created_at: string
          id: string
          position: number
          url: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          url: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          url?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_staff: {
        Row: {
          added_by: string | null
          created_at: string
          role: string
          user_id: string
          venue_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          role?: string
          user_id: string
          venue_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          role?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_staff_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_staff_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_staff_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_team_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_team_invites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "sales_commissions"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_team_invites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_activation"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "venue_team_invites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          approval_status: string
          brand_id: string | null
          cancellation_policy: boolean
          cancellation_reason: string | null
          categories: string[]
          category: string
          city: string | null
          contact_person_name: string | null
          contact_phone: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          hear_about_us: string[] | null
          id: string
          is_active: boolean
          latitude: number | null
          location_email: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          owner_id: string
          payment_status: string | null
          phone: string | null
          require_ad_disclosure: boolean
          require_venue_tag: boolean
          signup_completed: boolean
          subscription_renews_at: string | null
          subscription_started_at: string | null
          subscription_tier_id: string | null
          timezone: string | null
          updated_at: string
          venue_type: string
          website: string | null
          whatsapp_phone: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          approval_status?: string
          brand_id?: string | null
          cancellation_policy?: boolean
          cancellation_reason?: string | null
          categories?: string[]
          category?: string
          city?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hear_about_us?: string[] | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location_email?: string | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          owner_id: string
          payment_status?: string | null
          phone?: string | null
          require_ad_disclosure?: boolean
          require_venue_tag?: boolean
          signup_completed?: boolean
          subscription_renews_at?: string | null
          subscription_started_at?: string | null
          subscription_tier_id?: string | null
          timezone?: string | null
          updated_at?: string
          venue_type?: string
          website?: string | null
          whatsapp_phone?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          approval_status?: string
          brand_id?: string | null
          cancellation_policy?: boolean
          cancellation_reason?: string | null
          categories?: string[]
          category?: string
          city?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hear_about_us?: string[] | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location_email?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string
          payment_status?: string | null
          phone?: string | null
          require_ad_disclosure?: boolean
          require_venue_tag?: boolean
          signup_completed?: boolean
          subscription_renews_at?: string | null
          subscription_started_at?: string | null
          subscription_tier_id?: string | null
          timezone?: string | null
          updated_at?: string
          venue_type?: string
          website?: string | null
          whatsapp_phone?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_subscription_tier_id_fkey"
            columns: ["subscription_tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
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
      creator_pipeline: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          area: string | null
          created_at: string | null
          delivered_posts: number | null
          followers: number | null
          full_name: string | null
          id: string | null
          instagram_handle: string | null
          is_suspended: boolean | null
          kind: string | null
          last_post_at: string | null
          last_visit_at: string | null
          next_action: string | null
          next_action_date: string | null
          no_shows: number | null
          on_time_posts: number | null
          owner_id: string | null
          source: string | null
          stage: string | null
          strikes: number | null
          suspended_until: string | null
          user_id: string | null
          verified_posts: number | null
          visits: number | null
        }
        Relationships: []
      }
      sales_alerts: {
        Row: {
          detail: string | null
          hours_waiting: number | null
          kind: string | null
          lead_id: string | null
          rep_id: string | null
          subject: string | null
          venue_id: string | null
        }
        Relationships: []
      }
      sales_commissions: {
        Row: {
          amount: number | null
          days_live: number | null
          live_since: string | null
          payment_status: string | null
          qualified: boolean | null
          rep_id: string | null
          venue_id: string | null
          venue_name: string | null
        }
        Relationships: []
      }
      venue_activation: {
        Row: {
          approval_status: string | null
          created_at: string | null
          first_content_published: boolean | null
          first_creator_visit: boolean | null
          first_offer_posted: boolean | null
          is_active: boolean | null
          lead_id: string | null
          lead_stage: string | null
          name: string | null
          payment_status: string | null
          photos_uploaded: boolean | null
          profile_complete: boolean | null
          rep_id: string | null
          subscription_renews_at: string | null
          subscription_tier_id: string | null
          venue_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_subscription_tier_id_fkey"
            columns: ["subscription_tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_creator_strike: {
        Args: { _influencer: string; _reason: string; _redemption: string }
        Returns: undefined
      }
      booking_window: {
        Args: { _day: string; _hours: Json; _open_before_hours?: number }
        Returns: Record<string, unknown>
      }
      can_approve_records: { Args: never; Returns: boolean }
      can_bulk_import: { Args: never; Returns: boolean }
      can_bulk_reassign: { Args: never; Returns: boolean }
      can_delete_any_record: { Args: never; Returns: boolean }
      can_export_data: { Args: never; Returns: boolean }
      can_manage_creators: { Args: never; Returns: boolean }
      can_manage_delivery: { Args: never; Returns: boolean }
      can_manage_login: {
        Args: { _target_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      check_in_booking: {
        Args: { _code: string; _lat?: number; _lng?: number }
        Returns: Json
      }
      check_lead_duplicate: {
        Args: {
          _exclude?: string
          _instagram: string
          _maps_place_id?: string
          _phone: string
        }
        Returns: {
          kind: string
          match_name: string
          matched_on: string
          owner_name: string
        }[]
      }
      confirm_booking_received: {
        Args: { _redemption_id: string }
        Returns: Json
      }
      confirm_post_live: {
        Args: { _redemption_id: string; _still_live: boolean }
        Returns: Json
      }
      delivery_send_reminders: { Args: never; Returns: number }
      delivery_sweep: { Args: never; Returns: Json }
      disable_staff_login: {
        Args: { _reason?: string; _user_id: string }
        Returns: Json
      }
      find_leads_by_phone: {
        Args: { _phone: string }
        Returns: {
          id: string
          owner_id: string
        }[]
      }
      gen_checkin_code: { Args: never; Returns: string }
      get_discoverable_influencers: {
        Args: never
        Returns: {
          avatar_url: string
          badge: string
          bio: string
          city: string
          country: string
          cover_image_url: string
          engagement_rate: number
          followers_count: number
          full_name: string
          influencer_score: number
          instagram_handle: string
          is_verified: boolean
          niche: string[]
          tiktok_followers: number
          tiktok_handle: string
          user_id: string
        }[]
      }
      get_lead_prefill: {
        Args: { _lead_id: string }
        Returns: {
          area: string
          category: string
          city: string
          contact_name: string
          phone: string
          venue_name: string
        }[]
      }
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
      get_public_platform_settings: {
        Args: never
        Returns: {
          key: string
          value: Json
        }[]
      }
      get_public_profiles_basic: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          badge: string
          city: string
          country: string
          full_name: string
          instagram_handle: string
          is_verified: boolean
          tiktok_handle: string
          user_id: string
        }[]
      }
      get_public_profiles_detailed: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          badge: string
          bio: string
          city: string
          country: string
          cover_image_url: string
          engagement_rate: number
          followers_count: number
          full_name: string
          influencer_score: number
          instagram_handle: string
          is_verified: boolean
          niche: string[]
          tiktok_followers: number
          tiktok_handle: string
          user_id: string
        }[]
      }
      get_support_admin_id: { Args: never; Returns: string }
      get_venue_contact: {
        Args: { _venue_id: string }
        Returns: {
          contact_phone: string
          email: string
          phone: string
          whatsapp_phone: string
        }[]
      }
      get_venue_full: {
        Args: { _venue_id?: string }
        Returns: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          approval_status: string
          brand_id: string | null
          cancellation_policy: boolean
          cancellation_reason: string | null
          categories: string[]
          category: string
          city: string | null
          contact_person_name: string | null
          contact_phone: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          hear_about_us: string[] | null
          id: string
          is_active: boolean
          latitude: number | null
          location_email: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          owner_id: string
          payment_status: string | null
          phone: string | null
          require_ad_disclosure: boolean
          require_venue_tag: boolean
          signup_completed: boolean
          subscription_renews_at: string | null
          subscription_started_at: string | null
          subscription_tier_id: string | null
          timezone: string | null
          updated_at: string
          venue_type: string
          website: string | null
          whatsapp_phone: string | null
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "venues"
          isOneToOne: false
          isSetofReturn: true
        }
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
      is_sales_manager: { Args: never; Returns: boolean }
      is_sales_staff: { Args: never; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
      is_venue_member: { Args: { _venue_id: string }; Returns: boolean }
      is_venue_owner: { Args: { _venue_id: string }; Returns: boolean }
      log_staff_action: {
        Args: {
          _action: string
          _detail?: Json
          _table: string
          _target: string
        }
        Returns: undefined
      }
      manage_users_unclaimed: { Args: never; Returns: boolean }
      manual_check_in: {
        Args: { _reason: string; _redemption_id: string }
        Returns: Json
      }
      mark_booking_shipped: { Args: { _redemption_id: string }; Returns: Json }
      my_staff_access: { Args: never; Returns: Json }
      normalize_lb_phone: { Args: { _p: string }; Returns: string }
      recycle_lost_leads: { Args: never; Returns: number }
      review_booking_post: {
        Args: { _approve: boolean; _note?: string; _redemption_id: string }
        Returns: Json
      }
      set_shipping_details: {
        Args: {
          _address: string
          _city: string
          _name: string
          _phone: string
          _redemption_id: string
        }
        Returns: Json
      }
      staff_level: { Args: { _area: string }; Returns: string }
      submit_booking_post: {
        Args: { _redemption_id: string; _url: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "venue"
        | "influencer"
        | "sales_rep"
        | "sales_manager"
        | "venue_staff"
        | "account_manager"
        | "creator_manager"
        | "marketing"
        | "support"
        | "finance"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "venue",
        "influencer",
        "sales_rep",
        "sales_manager",
        "venue_staff",
        "account_manager",
        "creator_manager",
        "marketing",
        "support",
        "finance",
      ],
    },
  },
} as const
