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
      can_access_business: { Args: { p_business_id: string }; Returns: boolean }
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
      diag_orphan_businesses: { Args: never; Returns: Json }
      get_dashboard_overview: {
        Args: { _business_id: string; _from_date?: string; _to_date?: string }
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
      has_business_role: {
        Args: {
          _business_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_reseller: { Args: { _user_id: string }; Returns: boolean }
      is_reseller_client: {
        Args: { _business_id: string; _reseller_id: string }
        Returns: boolean
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
