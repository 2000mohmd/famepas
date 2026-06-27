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
          handles: string[] | null
          id: string
          instagram_offers: Json | null
          invite_only: boolean | null
          is_draft: boolean | null
          location_id: string | null
          require_phone: boolean | null
          required_days_notice: number | null
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
          handles?: string[] | null
          id?: string
          instagram_offers?: Json | null
          invite_only?: boolean | null
          is_draft?: boolean | null
          location_id?: string | null
          require_phone?: boolean | null
          required_days_notice?: number | null
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
          handles?: string[] | null
          id?: string
          instagram_offers?: Json | null
          invite_only?: boolean | null
          is_draft?: boolean | null
          location_id?: string | null
          require_phone?: boolean | null
          required_days_notice?: number | null
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
          content_type: string
          content_url: string | null
          created_at: string
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
          content_type?: string
          content_url?: string | null
          created_at?: string
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
          content_type?: string
          content_url?: string | null
          created_at?: string
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
          created_at: string
          id: string
          influencer_id: string
          offer_id: string
          qr_code: string | null
          qr_expires_at: string | null
          qr_token: string | null
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
          qr_token?: string | null
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
          qr_token?: string | null
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
          campaign_id: string | null
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
          campaign_id?: string | null
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
          campaign_id?: string | null
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
            foreignKeyName: "offers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
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
          approval_status: string
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
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
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
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
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
      social_integrations: {
        Row: {
          access_token: string | null
          avatar_url: string | null
          connected_at: string
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          open_id: string | null
          platform: string
          refresh_token: string | null
          scope: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          access_token?: string | null
          avatar_url?: string | null
          connected_at?: string
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          open_id?: string | null
          platform: string
          refresh_token?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          access_token?: string | null
          avatar_url?: string | null
          connected_at?: string
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          open_id?: string | null
          platform?: string
          refresh_token?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
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
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          owner_id: string
          phone: string | null
          require_ad_disclosure: boolean
          require_venue_tag: boolean
          signup_completed: boolean
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
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          phone?: string | null
          require_ad_disclosure?: boolean
          require_venue_tag?: boolean
          signup_completed?: boolean
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
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          require_ad_disclosure?: boolean
          require_venue_tag?: boolean
          signup_completed?: boolean
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
      [_ in never]: never
    }
    Functions: {
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
      get_venue_contact: {
        Args: { _venue_id: string }
        Returns: {
          contact_phone: string
          email: string
          phone: string
          whatsapp_phone: string
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
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
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
