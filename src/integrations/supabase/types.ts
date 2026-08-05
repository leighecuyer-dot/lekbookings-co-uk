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
      ai_suggestions: {
        Row: {
          availability_snapshot: Json
          business_id: string
          campaign_sent: boolean | null
          campaign_type: string | null
          created_at: string
          id: string
          notes: string | null
          rated_at: string | null
          success_rating: number | null
          suggestion_text: string
        }
        Insert: {
          availability_snapshot?: Json
          business_id: string
          campaign_sent?: boolean | null
          campaign_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rated_at?: string | null
          success_rating?: number | null
          suggestion_text: string
        }
        Update: {
          availability_snapshot?: Json
          business_id?: string
          campaign_sent?: boolean | null
          campaign_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rated_at?: string | null
          success_rating?: number | null
          suggestion_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_paid: number | null
          business_id: string
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          deposit_amount: number | null
          end_time: string
          id: string
          image_urls: string[] | null
          notes: string | null
          payment_status: string | null
          service_id: string | null
          staff_id: string | null
          start_time: string
          status: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          business_id: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deposit_amount?: number | null
          end_time: string
          id?: string
          image_urls?: string[] | null
          notes?: string | null
          payment_status?: string | null
          service_id?: string | null
          staff_id?: string | null
          start_time: string
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          business_id?: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deposit_amount?: number | null
          end_time?: string
          id?: string
          image_urls?: string[] | null
          notes?: string | null
          payment_status?: string | null
          service_id?: string | null
          staff_id?: string | null
          start_time?: string
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      business_invites: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_notification_settings: {
        Row: {
          business_id: string
          created_at: string
          id: string
          notify_cancellation: boolean
          notify_daily_summary: boolean
          notify_new_booking: boolean
          notify_reschedule: boolean
          owner_channel_email: boolean
          owner_channel_sms: boolean
          owner_email: string | null
          owner_phone: string | null
          staff_alert_channel_email: boolean
          staff_alert_channel_sms: boolean
          staff_alerts_enabled: boolean
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          notify_cancellation?: boolean
          notify_daily_summary?: boolean
          notify_new_booking?: boolean
          notify_reschedule?: boolean
          owner_channel_email?: boolean
          owner_channel_sms?: boolean
          owner_email?: string | null
          owner_phone?: string | null
          staff_alert_channel_email?: boolean
          staff_alert_channel_sms?: boolean
          staff_alerts_enabled?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          notify_cancellation?: boolean
          notify_daily_summary?: boolean
          notify_new_booking?: boolean
          notify_reschedule?: boolean
          owner_channel_email?: boolean
          owner_channel_sms?: boolean
          owner_email?: string | null
          owner_phone?: string | null
          staff_alert_channel_email?: boolean
          staff_alert_channel_sms?: boolean
          staff_alerts_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_sms_settings: {
        Row: {
          business_id: string
          cancellation_template: string
          confirmation_enabled: boolean
          confirmation_template: string
          created_at: string
          id: string
          reminder_enabled: boolean
          reminder_template: string
          reschedule_template: string
          sender_name: string | null
          sms_enabled: boolean
          status_change_enabled: boolean
          updated_at: string
        }
        Insert: {
          business_id: string
          cancellation_template?: string
          confirmation_enabled?: boolean
          confirmation_template?: string
          created_at?: string
          id?: string
          reminder_enabled?: boolean
          reminder_template?: string
          reschedule_template?: string
          sender_name?: string | null
          sms_enabled?: boolean
          status_change_enabled?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancellation_template?: string
          confirmation_enabled?: boolean
          confirmation_template?: string
          created_at?: string
          id?: string
          reminder_enabled?: boolean
          reminder_template?: string
          reschedule_template?: string
          sender_name?: string | null
          sms_enabled?: boolean
          status_change_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_sms_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          ai_context: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          timezone: string
          updated_at: string
          website_urls: string[] | null
        }
        Insert: {
          address?: string | null
          ai_context?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          timezone?: string
          updated_at?: string
          website_urls?: string[] | null
        }
        Update: {
          address?: string | null
          ai_context?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          timezone?: string
          updated_at?: string
          website_urls?: string[] | null
        }
        Relationships: []
      }
      campaign_conversions: {
        Row: {
          booking_id: string
          booking_value: number | null
          campaign_id: string
          converted_at: string
          customer_id: string
          id: string
        }
        Insert: {
          booking_id: string
          booking_value?: number | null
          campaign_id: string
          converted_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          booking_id?: string
          booking_value?: number | null
          campaign_id?: string
          converted_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_conversions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_conversions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_conversions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          business_id: string
          campaign_type: string
          created_at: string
          failed_count: number
          id: string
          message_template: string
          name: string
          recipient_count: number
          recipient_customer_ids: string[] | null
          sent_at: string
          sent_count: number
          target_audience: string | null
        }
        Insert: {
          business_id: string
          campaign_type?: string
          created_at?: string
          failed_count?: number
          id?: string
          message_template: string
          name: string
          recipient_count?: number
          recipient_customer_ids?: string[] | null
          sent_at?: string
          sent_count?: number
          target_audience?: string | null
        }
        Update: {
          business_id?: string
          campaign_type?: string
          created_at?: string
          failed_count?: number
          id?: string
          message_template?: string
          name?: string
          recipient_count?: number
          recipient_customer_ids?: string[] | null
          sent_at?: string
          sent_count?: number
          target_audience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contact_preferences: {
        Row: {
          business_id: string
          consent_ip_address: string | null
          consent_source: string | null
          consent_timestamp: string | null
          created_at: string
          customer_id: string
          email: string | null
          id: string
          last_marketing_email_at: string | null
          last_marketing_sms_at: string | null
          last_marketing_whatsapp_at: string | null
          marketing_email_opt_in: boolean
          marketing_messages_this_week: number
          marketing_sms_opt_in: boolean
          marketing_whatsapp_opt_in: boolean
          phone: string | null
          transactional_email_enabled: boolean
          transactional_sms_enabled: boolean
          transactional_whatsapp_enabled: boolean
          updated_at: string
          week_start_date: string | null
          whatsapp: string | null
        }
        Insert: {
          business_id: string
          consent_ip_address?: string | null
          consent_source?: string | null
          consent_timestamp?: string | null
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          last_marketing_email_at?: string | null
          last_marketing_sms_at?: string | null
          last_marketing_whatsapp_at?: string | null
          marketing_email_opt_in?: boolean
          marketing_messages_this_week?: number
          marketing_sms_opt_in?: boolean
          marketing_whatsapp_opt_in?: boolean
          phone?: string | null
          transactional_email_enabled?: boolean
          transactional_sms_enabled?: boolean
          transactional_whatsapp_enabled?: boolean
          updated_at?: string
          week_start_date?: string | null
          whatsapp?: string | null
        }
        Update: {
          business_id?: string
          consent_ip_address?: string | null
          consent_source?: string | null
          consent_timestamp?: string | null
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          last_marketing_email_at?: string | null
          last_marketing_sms_at?: string | null
          last_marketing_whatsapp_at?: string | null
          marketing_email_opt_in?: boolean
          marketing_messages_this_week?: number
          marketing_sms_opt_in?: boolean
          marketing_whatsapp_opt_in?: boolean
          phone?: string | null
          transactional_email_enabled?: boolean
          transactional_sms_enabled?: boolean
          transactional_whatsapp_enabled?: boolean
          updated_at?: string
          week_start_date?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contact_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contact_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sms_opt_out: {
        Row: {
          business_id: string
          opted_out_at: string
          phone_e164: string
        }
        Insert: {
          business_id: string
          opted_out_at?: string
          phone_e164: string
        }
        Update: {
          business_id?: string
          opted_out_at?: string
          phone_e164?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sms_opt_out_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_settings: {
        Row: {
          business_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          widget_order: string[] | null
          widget_sizes: Json | null
          widget_visibility: Json | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          widget_order?: string[] | null
          widget_sizes?: Json | null
          widget_visibility?: Json | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          widget_order?: string[] | null
          widget_sizes?: Json | null
          widget_visibility?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          title: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id: string
          is_active?: boolean
          label: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          business_id: string
          campaign_id: string | null
          channel: string
          cost_estimate: number | null
          created_at: string
          currency: string | null
          customer_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          message_preview: string | null
          message_type: string
          provider: string
          provider_message_id: string | null
          recipient: string
          status: string
          status_updated_at: string | null
          subject: string | null
          template_name: string | null
        }
        Insert: {
          business_id: string
          campaign_id?: string | null
          channel: string
          cost_estimate?: number | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_preview?: string | null
          message_type: string
          provider: string
          provider_message_id?: string | null
          recipient: string
          status?: string
          status_updated_at?: string | null
          subject?: string | null
          template_name?: string | null
        }
        Update: {
          business_id?: string
          campaign_id?: string | null
          channel?: string
          cost_estimate?: number | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_preview?: string | null
          message_type?: string
          provider?: string
          provider_message_id?: string | null
          recipient?: string
          status?: string
          status_updated_at?: string | null
          subject?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      page_sections: {
        Row: {
          business_id: string
          content: Json
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          section_type: string
          settings: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_type: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_type?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      page_themes: {
        Row: {
          accent_color: string | null
          business_id: string
          created_at: string
          custom_css: string | null
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          business_id: string
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          business_id?: string
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_themes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reseller_audit_logs: {
        Row: {
          action: string
          business_id: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: number
          payload: Json | null
          reseller_user_id: string
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: number
          payload?: Json | null
          reseller_user_id: string
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: number
          payload?: Json | null
          reseller_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_clients: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean | null
          monthly_price: number | null
          reseller_id: string
          subscription_tier: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          reseller_id: string
          subscription_tier?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          reseller_id?: string
          subscription_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_clients_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_data_requests: {
        Row: {
          business_id: string
          created_at: string
          data_type: string
          id: string
          request_message: string | null
          requested_at: string
          reseller_id: string
          responded_at: string | null
          responded_by: string | null
          response_message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          data_type: string
          id?: string
          request_message?: string | null
          requested_at?: string
          reseller_id: string
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          data_type?: string
          id?: string
          request_message?: string | null
          requested_at?: string
          reseller_id?: string
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_data_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_data_requests_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          markup_percentage: number | null
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          markup_percentage?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          markup_percentage?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_log: {
        Row: {
          body: string
          booking_id: string | null
          business_id: string
          error: string | null
          event_type: string
          id: string
          provider_sid: string | null
          sent_at: string
          status: string
          to_number: string
        }
        Insert: {
          body: string
          booking_id?: string | null
          business_id: string
          error?: string | null
          event_type: string
          id?: string
          provider_sid?: string | null
          sent_at?: string
          status: string
          to_number: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          business_id?: string
          error?: string | null
          event_type?: string
          id?: string
          provider_sid?: string | null
          sent_at?: string
          status?: string
          to_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_usage: {
        Row: {
          business_id: string
          cap: number
          id: string
          month: string
          sent_count: number
          updated_at: string
        }
        Insert: {
          business_id: string
          cap?: number
          id?: string
          month: string
          sent_count?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          cap?: number
          id?: string
          month?: string
          sent_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          business_id: string
          commission_percentage: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          revenue_tracking_enabled: boolean
          updated_at: string
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          avatar_url?: string | null
          business_id: string
          commission_percentage?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          revenue_tracking_enabled?: boolean
          updated_at?: string
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string
          commission_percentage?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          revenue_tracking_enabled?: boolean
          updated_at?: string
          user_id?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_customers: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          id: string
          staff_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          id?: string
          staff_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_customers_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string
          end_date: string
          id: string
          leave_type: string
          notes: string | null
          staff_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          end_date: string
          id?: string
          leave_type?: string
          notes?: string | null
          staff_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          notes?: string | null
          staff_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          id: string
          service_id: string
          staff_id: string
        }
        Insert: {
          id?: string
          service_id: string
          staff_id: string
        }
        Update: {
          id?: string
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          business_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string | null
          reseller_id: string
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string | null
          reseller_id: string
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string | null
          reseller_id?: string
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          booking_edit_scope: string
          business_id: string
          calendar_scope: string
          can_view_financials: boolean
          created_at: string
          id: string
          page_access: Json
          staff_alerts_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_edit_scope?: string
          business_id: string
          calendar_scope?: string
          can_view_financials?: boolean
          created_at?: string
          id?: string
          page_access?: Json
          staff_alerts_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_edit_scope?: string
          business_id?: string
          calendar_scope?: string
          can_view_financials?: boolean
          created_at?: string
          id?: string
          page_access?: Json
          staff_alerts_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          booking_id: string | null
          business_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          desired_date: string
          desired_end_time: string
          desired_start_time: string
          id: string
          notes: string | null
          notified_at: string | null
          service_id: string | null
          staff_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          business_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          desired_date: string
          desired_end_time: string
          desired_start_time: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          service_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          business_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          desired_date?: string
          desired_end_time?: string
          desired_start_time?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          service_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_business_invite: { Args: { _token: string }; Returns: Json }
      booking_edit_scope: {
        Args: { _business_id: string; _user_id: string }
        Returns: string
      }
      calendar_scope: {
        Args: { _business_id: string; _user_id: string }
        Returns: string
      }
      can_access_business: { Args: { p_business_id: string }; Returns: boolean }
      check_marketing_rate_limit: {
        Args: {
          p_business_id: string
          p_channel: string
          p_customer_id: string
        }
        Returns: boolean
      }
      create_business_with_owner: {
        Args: {
          _industry: string
          _name: string
          _phone: string
          _slug: string
        }
        Returns: {
          address: string | null
          ai_context: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          timezone: string
          updated_at: string
          website_urls: string[] | null
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_reseller_account: {
        Args: {
          _company_name: string
          _contact_email?: string
          _contact_phone?: string
          _logo_url?: string
          _primary_color?: string
          _secondary_color?: string
          _slug: string
        }
        Returns: string
      }
      create_reseller_client_business: {
        Args: {
          _business_email?: string
          _business_name: string
          _business_phone?: string
          _industry?: string
          _owner_email?: string
          _subscription_tier?: string
        }
        Returns: Json
      }
      customer_visible_to_staff: {
        Args: { _customer: string; _user: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      diag_orphan_businesses: { Args: never; Returns: Json }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_dashboard_overview: {
        Args: { _business_id: string; _from_date?: string; _to_date?: string }
        Returns: Json
      }
      get_invite_details: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          business_name: string
          email: string
          expires_at: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_public_booking_availability: {
        Args: {
          p_business_id: string
          p_day_end: string
          p_day_start: string
          p_service_id: string
        }
        Returns: Json
      }
      get_reseller_audit_logs: {
        Args: { p_business_id?: string; p_limit?: number }
        Returns: {
          action: string
          business_id: string
          created_at: string
          entity: string
          entity_id: string
          id: number
          payload: Json
        }[]
      }
      get_reseller_id: { Args: { _user_id: string }; Returns: string }
      get_user_business_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_permissions: {
        Args: { _business_id: string; _user_id: string }
        Returns: Json
      }
      handle_messaging_opt_out: {
        Args: { p_channel: string; p_phone: string }
        Returns: undefined
      }
      has_business_role: {
        Args: {
          _business_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      increment_marketing_counter: {
        Args: {
          p_business_id: string
          p_channel: string
          p_customer_id: string
        }
        Returns: undefined
      }
      is_reseller: { Args: { _user_id: string }; Returns: boolean }
      is_reseller_client: {
        Args: { _business_id: string; _reseller_id: string }
        Returns: boolean
      }
      link_staff_to_user: {
        Args: { _staff_id: string; _user_id: string }
        Returns: undefined
      }
      list_business_members: {
        Args: { _business_id: string }
        Returns: {
          email: string
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_staff_id: {
        Args: { _business_id: string; _user_id: string }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reseller_create_booking: {
        Args: {
          p_business_id: string
          p_customer_email?: string
          p_customer_id?: string
          p_customer_name: string
          p_customer_phone?: string
          p_end_time: string
          p_notes?: string
          p_service_id?: string
          p_staff_id?: string
          p_start_time: string
          p_status?: string
        }
        Returns: string
      }
      reseller_create_customer: {
        Args: {
          p_business_id: string
          p_email?: string
          p_name: string
          p_notes?: string
          p_phone?: string
        }
        Returns: string
      }
      reseller_create_invite: {
        Args: {
          p_business_id: string
          p_email: string
          p_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      reseller_get_business_invites: {
        Args: { p_business_id: string }
        Returns: {
          accepted_at: string
          created_at: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }[]
      }
      reseller_revoke_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      reseller_update_booking_status: {
        Args: { p_booking_id: string; p_new_status: string }
        Returns: undefined
      }
      reseller_update_customer: {
        Args: {
          p_customer_id: string
          p_email?: string
          p_name?: string
          p_notes?: string
          p_phone?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "staff" | "readonly" | "reseller"
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
      app_role: ["owner", "admin", "staff", "readonly", "reseller"],
    },
  },
} as const
