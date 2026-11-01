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
      access_requests: {
        Row: {
          admin_comment: string | null
          company_user_id: string
          created_at: string
          id: string
          license_id: string
          message: string | null
          processed_at: string | null
          processed_by: string | null
          requested_features: string[]
          status: string
          updated_at: string
        }
        Insert: {
          admin_comment?: string | null
          company_user_id: string
          created_at?: string
          id?: string
          license_id: string
          message?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_features: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          admin_comment?: string | null
          company_user_id?: string
          created_at?: string
          id?: string
          license_id?: string
          message?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_features?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_requests_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      active_itinerary_sessions: {
        Row: {
          avoid_low_bridges: boolean | null
          avoid_truck_forbidden: boolean | null
          avoid_weight_restrictions: boolean | null
          created_at: string
          destination_address: string | null
          destination_lat: number | null
          destination_lon: number | null
          display_name: string | null
          highway_route: Json | null
          id: string
          is_panel_open: boolean | null
          last_activity_at: string | null
          license_id: string | null
          national_route: Json | null
          origin_address: string | null
          origin_lat: number | null
          origin_lon: number | null
          selected_client_id: string | null
          selected_route_type: string | null
          selected_vehicle_id: string | null
          stops: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avoid_low_bridges?: boolean | null
          avoid_truck_forbidden?: boolean | null
          avoid_weight_restrictions?: boolean | null
          created_at?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lon?: number | null
          display_name?: string | null
          highway_route?: Json | null
          id?: string
          is_panel_open?: boolean | null
          last_activity_at?: string | null
          license_id?: string | null
          national_route?: Json | null
          origin_address?: string | null
          origin_lat?: number | null
          origin_lon?: number | null
          selected_client_id?: string | null
          selected_route_type?: string | null
          selected_vehicle_id?: string | null
          stops?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avoid_low_bridges?: boolean | null
          avoid_truck_forbidden?: boolean | null
          avoid_weight_restrictions?: boolean | null
          created_at?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lon?: number | null
          display_name?: string | null
          highway_route?: Json | null
          id?: string
          is_panel_open?: boolean | null
          last_activity_at?: string | null
          license_id?: string | null
          national_route?: Json | null
          origin_address?: string | null
          origin_lat?: number | null
          origin_lon?: number | null
          selected_client_id?: string | null
          selected_route_type?: string | null
          selected_vehicle_id?: string | null
          stops?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_itinerary_sessions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
        }
        Insert: {
          action: string
          admin_email: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
        }
        Relationships: []
      }
      app_updates: {
        Row: {
          created_at: string
          download_count: number | null
          download_url: string | null
          id: string
          is_active: boolean
          platform: string
          pub_date: string
          release_notes: string | null
          signature: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          download_count?: number | null
          download_url?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          pub_date?: string
          release_notes?: string | null
          signature?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          download_count?: number | null
          download_url?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          pub_date?: string
          release_notes?: string | null
          signature?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      central_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          level: string
          license_id: string | null
          message: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          level?: string
          license_id?: string | null
          message: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          level?: string
          license_id?: string | null
          message?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "central_announcements_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      central_bridge: {
        Row: {
          config: Json
          id: number
          secret_hash: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: number
          secret_hash?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: number
          secret_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      charge_presets: {
        Row: {
          charges: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          license_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          charges?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          license_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          charges?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          license_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_presets_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      client_addresses: {
        Row: {
          address: string
          city: string | null
          client_id: string
          country: string | null
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          postal_code: string | null
        }
        Insert: {
          address: string
          city?: string | null
          client_id: string
          country?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          client_id?: string
          country?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          role: string | null
          site_city: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          site_city?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          site_city?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          license_id: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          license_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          license_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_config: {
        Row: {
          config_data: Json
          config_type: string
          created_at: string
          id: string
          license_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          config_data?: Json
          config_type: string
          created_at?: string
          id?: string
          license_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          config_data?: Json
          config_type?: string
          created_at?: string
          id?: string
          license_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_config_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          ai_status: string
          data_url: string
          expires_on: string | null
          extracted: Json
          file_name: string | null
          id: string
          issued_on: string | null
          issues: string[]
          kind: string
          license_id: string
          mime: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          ai_status?: string
          data_url: string
          expires_on?: string | null
          extracted?: Json
          file_name?: string | null
          id?: string
          issued_on?: string | null
          issues?: string[]
          kind: string
          license_id: string
          mime: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          ai_status?: string
          data_url?: string
          expires_on?: string | null
          extracted?: Json
          file_name?: string | null
          id?: string
          issued_on?: string | null
          issues?: string[]
          kind?: string
          license_id?: string
          mime?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          license_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          license_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          license_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          license_id: string | null
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          quote_conditions: string | null
          quote_footer: string | null
          siret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          license_id?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          quote_conditions?: string | null
          quote_footer?: string | null
          siret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          license_id?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          quote_conditions?: string | null
          quote_footer?: string | null
          siret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_sync_events: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          event_data: Json | null
          event_type: string
          id: string
          license_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          event_data?: Json | null
          event_type: string
          id?: string
          license_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          license_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_sync_events_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by: string | null
          created_via: string | null
          display_name: string | null
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          last_activity_at: string | null
          license_id: string
          login_id: string | null
          must_change_password: boolean
          password_set_at: string | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_via?: string | null
          display_name?: string | null
          email: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          license_id: string
          login_id?: string | null
          must_change_password?: boolean
          password_set_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_via?: string | null
          display_name?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          license_id?: string
          login_id?: string | null
          must_change_password?: boolean
          password_set_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_users_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_absences: {
        Row: {
          absence_type: string
          created_at: string
          driver_id: string
          end_date: string | null
          id: string
          license_id: string
          notes: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          absence_type: string
          created_at?: string
          driver_id: string
          end_date?: string | null
          id?: string
          license_id: string
          notes?: string | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          absence_type?: string
          created_at?: string
          driver_id?: string
          end_date?: string | null
          id?: string
          license_id?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exploitation_metric_settings: {
        Row: {
          can_view_dashboard_financials: boolean | null
          can_view_driver_cost: boolean | null
          can_view_forecast: boolean | null
          can_view_fuel_cost: boolean | null
          can_view_margin: boolean | null
          can_view_price_per_km: boolean | null
          can_view_profit: boolean | null
          can_view_revenue: boolean | null
          can_view_structure_cost: boolean | null
          can_view_toll_cost: boolean | null
          can_view_total_cost: boolean | null
          created_at: string
          id: string
          license_id: string
          updated_at: string
        }
        Insert: {
          can_view_dashboard_financials?: boolean | null
          can_view_driver_cost?: boolean | null
          can_view_forecast?: boolean | null
          can_view_fuel_cost?: boolean | null
          can_view_margin?: boolean | null
          can_view_price_per_km?: boolean | null
          can_view_profit?: boolean | null
          can_view_revenue?: boolean | null
          can_view_structure_cost?: boolean | null
          can_view_toll_cost?: boolean | null
          can_view_total_cost?: boolean | null
          created_at?: string
          id?: string
          license_id: string
          updated_at?: string
        }
        Update: {
          can_view_dashboard_financials?: boolean | null
          can_view_driver_cost?: boolean | null
          can_view_forecast?: boolean | null
          can_view_fuel_cost?: boolean | null
          can_view_margin?: boolean | null
          can_view_price_per_km?: boolean | null
          can_view_profit?: boolean | null
          can_view_revenue?: boolean | null
          can_view_structure_cost?: boolean | null
          can_view_toll_cost?: boolean | null
          can_view_total_cost?: boolean | null
          created_at?: string
          id?: string
          license_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exploitation_metric_settings_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: true
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_addresses: {
        Row: {
          address: string
          category: string | null
          city: string | null
          created_at: string
          created_by_name: string | null
          id: string
          lat: number
          license_id: string | null
          lon: number
          name: string
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          category?: string | null
          city?: string | null
          created_at?: string
          created_by_name?: string | null
          id?: string
          lat: number
          license_id?: string | null
          lon: number
          name: string
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          category?: string | null
          city?: string | null
          created_at?: string
          created_by_name?: string | null
          id?: string
          lat?: number
          license_id?: string | null
          lon?: number
          name?: string
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_addresses_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      license_addons: {
        Row: {
          activated_at: string | null
          addon_id: string
          addon_name: string
          created_at: string
          deactivated_at: string | null
          id: string
          is_active: boolean
          license_id: string
          monthly_price: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          activated_at?: string | null
          addon_id: string
          addon_name: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          license_id: string
          monthly_price?: number
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          activated_at?: string | null
          addon_id?: string
          addon_name?: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          license_id?: string
          monthly_price?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "license_addons_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      license_features: {
        Row: {
          ai_optimization: boolean | null
          ai_pdf_analysis: boolean | null
          auto_pricing: boolean | null
          auto_pricing_basic: boolean | null
          basic_calculator: boolean | null
          btn_ai_optimize: boolean | null
          client_analysis: boolean | null
          client_analysis_basic: boolean | null
          cost_analysis: boolean | null
          cost_analysis_basic: boolean | null
          created_at: string
          dashboard_analytics: boolean | null
          dashboard_basic: boolean | null
          dynamic_charts: boolean | null
          excel_export: boolean | null
          forecast: boolean | null
          id: string
          itinerary_planning: boolean | null
          license_id: string | null
          margin_alerts: boolean | null
          max_clients: number | null
          max_daily_charges: number | null
          max_drivers: number | null
          max_monthly_charges: number | null
          max_saved_tours: number | null
          max_vehicles: number | null
          max_yearly_charges: number | null
          monthly_tracking: boolean | null
          multi_agency: boolean | null
          multi_drivers: boolean | null
          multi_users: boolean | null
          page_ai_analysis: boolean | null
          page_forecast: boolean | null
          page_toxic_clients: boolean | null
          page_vehicle_reports: boolean | null
          pdf_export_pro: boolean | null
          saved_tours: boolean | null
          smart_quotes: boolean | null
          tms_erp_integration: boolean | null
          trip_history: boolean | null
          unlimited_vehicles: boolean | null
          updated_at: string
        }
        Insert: {
          ai_optimization?: boolean | null
          ai_pdf_analysis?: boolean | null
          auto_pricing?: boolean | null
          auto_pricing_basic?: boolean | null
          basic_calculator?: boolean | null
          btn_ai_optimize?: boolean | null
          client_analysis?: boolean | null
          client_analysis_basic?: boolean | null
          cost_analysis?: boolean | null
          cost_analysis_basic?: boolean | null
          created_at?: string
          dashboard_analytics?: boolean | null
          dashboard_basic?: boolean | null
          dynamic_charts?: boolean | null
          excel_export?: boolean | null
          forecast?: boolean | null
          id?: string
          itinerary_planning?: boolean | null
          license_id?: string | null
          margin_alerts?: boolean | null
          max_clients?: number | null
          max_daily_charges?: number | null
          max_drivers?: number | null
          max_monthly_charges?: number | null
          max_saved_tours?: number | null
          max_vehicles?: number | null
          max_yearly_charges?: number | null
          monthly_tracking?: boolean | null
          multi_agency?: boolean | null
          multi_drivers?: boolean | null
          multi_users?: boolean | null
          page_ai_analysis?: boolean | null
          page_forecast?: boolean | null
          page_toxic_clients?: boolean | null
          page_vehicle_reports?: boolean | null
          pdf_export_pro?: boolean | null
          saved_tours?: boolean | null
          smart_quotes?: boolean | null
          tms_erp_integration?: boolean | null
          trip_history?: boolean | null
          unlimited_vehicles?: boolean | null
          updated_at?: string
        }
        Update: {
          ai_optimization?: boolean | null
          ai_pdf_analysis?: boolean | null
          auto_pricing?: boolean | null
          auto_pricing_basic?: boolean | null
          basic_calculator?: boolean | null
          btn_ai_optimize?: boolean | null
          client_analysis?: boolean | null
          client_analysis_basic?: boolean | null
          cost_analysis?: boolean | null
          cost_analysis_basic?: boolean | null
          created_at?: string
          dashboard_analytics?: boolean | null
          dashboard_basic?: boolean | null
          dynamic_charts?: boolean | null
          excel_export?: boolean | null
          forecast?: boolean | null
          id?: string
          itinerary_planning?: boolean | null
          license_id?: string | null
          margin_alerts?: boolean | null
          max_clients?: number | null
          max_daily_charges?: number | null
          max_drivers?: number | null
          max_monthly_charges?: number | null
          max_saved_tours?: number | null
          max_vehicles?: number | null
          max_yearly_charges?: number | null
          monthly_tracking?: boolean | null
          multi_agency?: boolean | null
          multi_drivers?: boolean | null
          multi_users?: boolean | null
          page_ai_analysis?: boolean | null
          page_forecast?: boolean | null
          page_toxic_clients?: boolean | null
          page_vehicle_reports?: boolean | null
          pdf_export_pro?: boolean | null
          saved_tours?: boolean | null
          smart_quotes?: boolean | null
          tms_erp_integration?: boolean | null
          trip_history?: boolean | null
          unlimited_vehicles?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_features_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          activated_at: string | null
          addons_monthly_total: number | null
          address: string | null
          base_monthly_price: number | null
          billing_period: string | null
          city: string | null
          company_email: string | null
          company_identifier: string | null
          company_name: string | null
          company_phone: string | null
          company_status: string | null
          contact_completed_at: string | null
          created_at: string
          current_period_end: string | null
          email: string
          employee_count: number | null
          first_name: string | null
          hidden_pages: string[]
          id: string
          is_active: boolean
          last_name: string | null
          last_stripe_sync_at: string | null
          last_used_at: string | null
          legal_form: string | null
          licence_copies: number | null
          licence_copies_updated_at: string | null
          license_code: string
          manager_name: string | null
          max_clients: number | null
          max_daily_charges: number | null
          max_drivers: number | null
          max_monthly_charges: number | null
          max_users: number | null
          max_yearly_charges: number | null
          naf_code: string | null
          naf_label: string | null
          next_billing_date: string | null
          notes: string | null
          plan_type: string | null
          postal_code: string | null
          show_address_info: boolean | null
          show_company_info: boolean | null
          show_license_info: boolean | null
          show_user_info: boolean | null
          siren: string | null
          siret: string | null
          slug: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          vat_number: string | null
        }
        Insert: {
          activated_at?: string | null
          addons_monthly_total?: number | null
          address?: string | null
          base_monthly_price?: number | null
          billing_period?: string | null
          city?: string | null
          company_email?: string | null
          company_identifier?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_status?: string | null
          contact_completed_at?: string | null
          created_at?: string
          current_period_end?: string | null
          email: string
          employee_count?: number | null
          first_name?: string | null
          hidden_pages?: string[]
          id?: string
          is_active?: boolean
          last_name?: string | null
          last_stripe_sync_at?: string | null
          last_used_at?: string | null
          legal_form?: string | null
          licence_copies?: number | null
          licence_copies_updated_at?: string | null
          license_code: string
          manager_name?: string | null
          max_clients?: number | null
          max_daily_charges?: number | null
          max_drivers?: number | null
          max_monthly_charges?: number | null
          max_users?: number | null
          max_yearly_charges?: number | null
          naf_code?: string | null
          naf_label?: string | null
          next_billing_date?: string | null
          notes?: string | null
          plan_type?: string | null
          postal_code?: string | null
          show_address_info?: boolean | null
          show_company_info?: boolean | null
          show_license_info?: boolean | null
          show_user_info?: boolean | null
          siren?: string | null
          siret?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          vat_number?: string | null
        }
        Update: {
          activated_at?: string | null
          addons_monthly_total?: number | null
          address?: string | null
          base_monthly_price?: number | null
          billing_period?: string | null
          city?: string | null
          company_email?: string | null
          company_identifier?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_status?: string | null
          contact_completed_at?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string
          employee_count?: number | null
          first_name?: string | null
          hidden_pages?: string[]
          id?: string
          is_active?: boolean
          last_name?: string | null
          last_stripe_sync_at?: string | null
          last_used_at?: string | null
          legal_form?: string | null
          licence_copies?: number | null
          licence_copies_updated_at?: string | null
          license_code?: string
          manager_name?: string | null
          max_clients?: number | null
          max_daily_charges?: number | null
          max_drivers?: number | null
          max_monthly_charges?: number | null
          max_users?: number | null
          max_yearly_charges?: number | null
          naf_code?: string | null
          naf_label?: string | null
          next_billing_date?: string | null
          notes?: string | null
          plan_type?: string | null
          postal_code?: string | null
          show_address_info?: boolean | null
          show_company_info?: boolean | null
          show_license_info?: boolean | null
          show_user_info?: boolean | null
          siren?: string | null
          siret?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      login_history: {
        Row: {
          device_type: string | null
          id: string
          ip_address: string | null
          license_id: string
          location: string | null
          login_at: string
          success: boolean
          user_agent: string | null
        }
        Insert: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          license_id: string
          location?: string | null
          login_at?: string
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          license_id?: string
          location?: string | null
          login_at?: string
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_history_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          event_type: string
          id: string
          is_read: boolean
          license_id: string
          link_url: string | null
          message: string | null
          read_at: string | null
          recipient_user_id: string
          title: string
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          event_type: string
          id?: string
          is_read?: boolean
          license_id: string
          link_url?: string | null
          message?: string | null
          read_at?: string | null
          recipient_user_id: string
          title: string
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          event_type?: string
          id?: string
          is_read?: boolean
          license_id?: string
          link_url?: string | null
          message?: string | null
          read_at?: string | null
          recipient_user_id?: string
          title?: string
        }
        Relationships: []
      }
      page_usage: {
        Row: {
          first_visited_at: string
          last_visited_at: string
          license_id: string
          path: string
          visits: number
        }
        Insert: {
          first_visited_at?: string
          last_visited_at?: string
          license_id: string
          path: string
          visits?: number
        }
        Update: {
          first_visited_at?: string
          last_visited_at?: string
          license_id?: string
          path?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_usage_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      planning_entries: {
        Row: {
          client_id: string | null
          created_at: string
          destination_address: string | null
          driver_id: string | null
          end_date: string | null
          end_time: string | null
          id: string
          is_all_year: boolean | null
          license_id: string | null
          line_reference: string | null
          mission_order: string | null
          notes: string | null
          origin_address: string | null
          parent_tour_id: string | null
          planning_date: string
          recurring_days: number[] | null
          relay_driver_id: string | null
          relay_location: string | null
          relay_time: string | null
          return_line_reference: string | null
          saved_tour_id: string | null
          sector_manager: string | null
          start_date: string | null
          start_time: string | null
          status: string
          stops: Json | null
          tour_name: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          destination_address?: string | null
          driver_id?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_all_year?: boolean | null
          license_id?: string | null
          line_reference?: string | null
          mission_order?: string | null
          notes?: string | null
          origin_address?: string | null
          parent_tour_id?: string | null
          planning_date: string
          recurring_days?: number[] | null
          relay_driver_id?: string | null
          relay_location?: string | null
          relay_time?: string | null
          return_line_reference?: string | null
          saved_tour_id?: string | null
          sector_manager?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          stops?: Json | null
          tour_name?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          destination_address?: string | null
          driver_id?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_all_year?: boolean | null
          license_id?: string | null
          line_reference?: string | null
          mission_order?: string | null
          notes?: string | null
          origin_address?: string | null
          parent_tour_id?: string | null
          planning_date?: string
          recurring_days?: number[] | null
          relay_driver_id?: string | null
          relay_location?: string | null
          relay_time?: string | null
          return_line_reference?: string | null
          saved_tour_id?: string | null
          sector_manager?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          stops?: Json | null
          tour_name?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_entries_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_entries_parent_tour_id_fkey"
            columns: ["parent_tour_id"]
            isOneToOne: false
            referencedRelation: "planning_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_entries_saved_tour_id_fkey"
            columns: ["saved_tour_id"]
            isOneToOne: false
            referencedRelation: "saved_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          config_data: Json
          config_key: string
          created_at: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_data?: Json
          config_key: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_data?: Json
          config_key?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      quote_acceptance_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          license_id: string | null
          quote_id: string
          refusal_comment: string | null
          responded_at: string | null
          response: string | null
          response_ip: string | null
          response_user_agent: string | null
          sent_to_email: string | null
          signed_name: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          license_id?: string | null
          quote_id: string
          refusal_comment?: string | null
          responded_at?: string | null
          response?: string | null
          response_ip?: string | null
          response_user_agent?: string | null
          sent_to_email?: string | null
          signed_name?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          license_id?: string | null
          quote_id?: string
          refusal_comment?: string | null
          responded_at?: string | null
          response?: string | null
          response_ip?: string | null
          response_user_agent?: string | null
          sent_to_email?: string | null
          signed_name?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_acceptance_links_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_acceptance_links_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          created_at: string
          destination_address: string
          distance_km: number
          id: string
          license_id: string | null
          margin_percent: number | null
          notes: string | null
          origin_address: string
          price_ht: number
          price_ttc: number
          quote_number: string
          status: string | null
          stops: Json | null
          total_cost: number
          tva_rate: number | null
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          destination_address: string
          distance_km: number
          id?: string
          license_id?: string | null
          margin_percent?: number | null
          notes?: string | null
          origin_address: string
          price_ht: number
          price_ttc: number
          quote_number: string
          status?: string | null
          stops?: Json | null
          total_cost: number
          tva_rate?: number | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          destination_address?: string
          distance_km?: number
          id?: string
          license_id?: string | null
          margin_percent?: number | null
          notes?: string | null
          origin_address?: string
          price_ht?: number
          price_ttc?: number
          quote_number?: string
          status?: string | null
          stops?: Json | null
          total_cost?: number
          tva_rate?: number | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          attempts: number | null
          first_attempt_at: string | null
          id: string
          identifier: string
          last_attempt_at: string | null
          locked_until: string | null
        }
        Insert: {
          action_type: string
          attempts?: number | null
          first_attempt_at?: string | null
          id?: string
          identifier: string
          last_attempt_at?: string | null
          locked_until?: string | null
        }
        Update: {
          action_type?: string
          attempts?: number | null
          first_attempt_at?: string | null
          id?: string
          identifier?: string
          last_attempt_at?: string | null
          locked_until?: string | null
        }
        Relationships: []
      }
      saved_tours: {
        Row: {
          adblue_cost: number
          category: string | null
          client_id: string | null
          created_at: string
          destination_address: string
          distance_km: number
          driver_cost: number
          driver_ids: string[] | null
          drivers_data: Json | null
          duration_minutes: number | null
          fixed_price: number | null
          fuel_cost: number
          id: string
          is_favorite: boolean | null
          license_id: string | null
          mission_order: string | null
          name: string
          notes: string | null
          origin_address: string
          price_per_km: number | null
          pricing_mode: string | null
          profit: number
          profit_margin: number | null
          revenue: number
          stops: Json | null
          structure_cost: number
          tags: string[] | null
          target_margin: number | null
          toll_cost: number
          total_cost: number
          trailer_data: Json | null
          trailer_id: string | null
          updated_at: string
          user_id: string
          vehicle_cost: number
          vehicle_data: Json | null
          vehicle_id: string | null
          vehicle_ids: string[] | null
          vehicles_data: Json | null
        }
        Insert: {
          adblue_cost?: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          destination_address: string
          distance_km?: number
          driver_cost?: number
          driver_ids?: string[] | null
          drivers_data?: Json | null
          duration_minutes?: number | null
          fixed_price?: number | null
          fuel_cost?: number
          id?: string
          is_favorite?: boolean | null
          license_id?: string | null
          mission_order?: string | null
          name: string
          notes?: string | null
          origin_address: string
          price_per_km?: number | null
          pricing_mode?: string | null
          profit?: number
          profit_margin?: number | null
          revenue?: number
          stops?: Json | null
          structure_cost?: number
          tags?: string[] | null
          target_margin?: number | null
          toll_cost?: number
          total_cost?: number
          trailer_data?: Json | null
          trailer_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_cost?: number
          vehicle_data?: Json | null
          vehicle_id?: string | null
          vehicle_ids?: string[] | null
          vehicles_data?: Json | null
        }
        Update: {
          adblue_cost?: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          destination_address?: string
          distance_km?: number
          driver_cost?: number
          driver_ids?: string[] | null
          drivers_data?: Json | null
          duration_minutes?: number | null
          fixed_price?: number | null
          fuel_cost?: number
          id?: string
          is_favorite?: boolean | null
          license_id?: string | null
          mission_order?: string | null
          name?: string
          notes?: string | null
          origin_address?: string
          price_per_km?: number | null
          pricing_mode?: string | null
          profit?: number
          profit_margin?: number | null
          revenue?: number
          stops?: Json | null
          structure_cost?: number
          tags?: string[] | null
          target_margin?: number | null
          toll_cost?: number
          total_cost?: number
          trailer_data?: Json | null
          trailer_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_cost?: number
          vehicle_data?: Json | null
          vehicle_id?: string | null
          vehicle_ids?: string[] | null
          vehicles_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_tours_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_tours_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_tours_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          calculated: boolean | null
          client_id: string | null
          created_at: string
          destination_address: string
          destination_lat: number | null
          destination_lon: number | null
          display_name: string | null
          id: string
          license_id: string | null
          origin_address: string
          origin_lat: number | null
          origin_lon: number | null
          stops: Json | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          calculated?: boolean | null
          client_id?: string | null
          created_at?: string
          destination_address: string
          destination_lat?: number | null
          destination_lon?: number | null
          display_name?: string | null
          id?: string
          license_id?: string | null
          origin_address: string
          origin_lat?: number | null
          origin_lon?: number | null
          stops?: Json | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          calculated?: boolean | null
          client_id?: string | null
          created_at?: string
          destination_address?: string
          destination_lat?: number | null
          destination_lon?: number | null
          display_name?: string | null
          id?: string
          license_id?: string | null
          origin_address?: string
          origin_lat?: number | null
          origin_lon?: number | null
          stops?: Json | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author: string | null
          body: string
          created_at: string
          from_admin: boolean
          id: string
          thread_id: string
        }
        Insert: {
          author?: string | null
          body: string
          created_at?: string
          from_admin?: boolean
          id?: string
          thread_id: string
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          admin_email: string | null
          auth_user_id: string
          claimed_at: string | null
          company_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          license_id: string | null
          reason: string | null
          token_hash: string
        }
        Insert: {
          admin_email?: string | null
          auth_user_id: string
          claimed_at?: string | null
          company_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          license_id?: string | null
          reason?: string | null
          token_hash: string
        }
        Update: {
          admin_email?: string | null
          auth_user_id?: string
          claimed_at?: string | null
          company_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          license_id?: string | null
          reason?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      support_threads: {
        Row: {
          auth_user_id: string | null
          author_email: string | null
          author_name: string | null
          company_user_id: string | null
          context: Json
          created_at: string
          guest_token: string | null
          id: string
          kind: string
          last_message_at: string
          license_id: string | null
          page: string | null
          status: string
          subject: string
          unread_admin: boolean
          unread_user: boolean
        }
        Insert: {
          auth_user_id?: string | null
          author_email?: string | null
          author_name?: string | null
          company_user_id?: string | null
          context?: Json
          created_at?: string
          guest_token?: string | null
          id?: string
          kind?: string
          last_message_at?: string
          license_id?: string | null
          page?: string | null
          status?: string
          subject: string
          unread_admin?: boolean
          unread_user?: boolean
        }
        Update: {
          auth_user_id?: string | null
          author_email?: string | null
          author_name?: string | null
          company_user_id?: string | null
          context?: Json
          created_at?: string
          guest_token?: string | null
          id?: string
          kind?: string
          last_message_at?: string
          license_id?: string | null
          page?: string | null
          status?: string
          subject?: string
          unread_admin?: boolean
          unread_user?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "support_threads_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          adblue_cost: number | null
          client_id: string | null
          created_at: string
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number
          driver_cost: number | null
          driver_ids: string[] | null
          duration_minutes: number | null
          fuel_cost: number | null
          id: string
          license_id: string | null
          notes: string | null
          origin_address: string
          origin_lat: number | null
          origin_lng: number | null
          profit: number | null
          profit_margin: number | null
          revenue: number | null
          status: string | null
          stops: Json | null
          structure_cost: number | null
          toll_cost: number | null
          total_cost: number
          trip_date: string
          updated_at: string
          user_id: string
          vehicle_data: Json | null
        }
        Insert: {
          adblue_cost?: number | null
          client_id?: string | null
          created_at?: string
          destination_address: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km: number
          driver_cost?: number | null
          driver_ids?: string[] | null
          duration_minutes?: number | null
          fuel_cost?: number | null
          id?: string
          license_id?: string | null
          notes?: string | null
          origin_address: string
          origin_lat?: number | null
          origin_lng?: number | null
          profit?: number | null
          profit_margin?: number | null
          revenue?: number | null
          status?: string | null
          stops?: Json | null
          structure_cost?: number | null
          toll_cost?: number | null
          total_cost: number
          trip_date?: string
          updated_at?: string
          user_id: string
          vehicle_data?: Json | null
        }
        Update: {
          adblue_cost?: number | null
          client_id?: string | null
          created_at?: string
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number
          driver_cost?: number | null
          driver_ids?: string[] | null
          duration_minutes?: number | null
          fuel_cost?: number | null
          id?: string
          license_id?: string | null
          notes?: string | null
          origin_address?: string
          origin_lat?: number | null
          origin_lng?: number | null
          profit?: number | null
          profit_margin?: number | null
          revenue?: number | null
          status?: string | null
          stops?: Json | null
          structure_cost?: number | null
          toll_cost?: number | null
          total_cost?: number
          trip_date?: string
          updated_at?: string
          user_id?: string
          vehicle_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_charges: {
        Row: {
          amount: number
          category: string | null
          charge_data: Json | null
          created_at: string
          id: string
          is_ht: boolean | null
          license_id: string | null
          local_id: string
          name: string
          periodicity: string | null
          synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          charge_data?: Json | null
          created_at?: string
          id?: string
          is_ht?: boolean | null
          license_id?: string | null
          local_id: string
          name: string
          periodicity?: string | null
          synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          charge_data?: Json | null
          created_at?: string
          id?: string
          is_ht?: boolean | null
          license_id?: string | null
          local_id?: string
          name?: string
          periodicity?: string | null
          synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_charges_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_drivers: {
        Row: {
          base_salary: number | null
          created_at: string
          driver_data: Json | null
          driver_type: string | null
          hourly_rate: number | null
          id: string
          license_id: string | null
          local_id: string
          name: string
          synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_salary?: number | null
          created_at?: string
          driver_data?: Json | null
          driver_type?: string | null
          hourly_rate?: number | null
          id?: string
          license_id?: string | null
          local_id: string
          name: string
          synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_salary?: number | null
          created_at?: string
          driver_data?: Json | null
          driver_type?: string | null
          hourly_rate?: number | null
          id?: string
          license_id?: string | null
          local_id?: string
          name?: string
          synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_drivers_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feature_overrides: {
        Row: {
          company_user_id: string
          created_at: string
          created_by: string | null
          enabled: boolean
          feature_key: string
          id: string
          updated_at: string
        }
        Insert: {
          company_user_id: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          feature_key: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_user_id?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          feature_key?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_overrides_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          custom_working_days: Json | null
          default_chart_type: string | null
          default_price_per_km: number | null
          default_pricing_mode: string | null
          default_target_margin: number | null
          id: string
          language: string | null
          selected_driver_ids: string[] | null
          selected_trailer_id: string | null
          selected_vehicle_id: string | null
          show_ai_panel: boolean | null
          sidebar_collapsed: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_working_days?: Json | null
          default_chart_type?: string | null
          default_price_per_km?: number | null
          default_pricing_mode?: string | null
          default_target_margin?: number | null
          id?: string
          language?: string | null
          selected_driver_ids?: string[] | null
          selected_trailer_id?: string | null
          selected_vehicle_id?: string | null
          show_ai_panel?: boolean | null
          sidebar_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_working_days?: Json | null
          default_chart_type?: string | null
          default_price_per_km?: number | null
          default_pricing_mode?: string | null
          default_target_margin?: number | null
          id?: string
          language?: string | null
          selected_driver_ids?: string[] | null
          selected_trailer_id?: string | null
          selected_vehicle_id?: string | null
          show_ai_panel?: boolean | null
          sidebar_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          app_settings: Json
          created_at: string
          id: string
          last_saved_at: string
          license_id: string
          selected_driver_ids: string[] | null
          trip_params: Json
          updated_at: string
          user_id: string
          vehicle_params: Json
        }
        Insert: {
          app_settings?: Json
          created_at?: string
          id?: string
          last_saved_at?: string
          license_id: string
          selected_driver_ids?: string[] | null
          trip_params?: Json
          updated_at?: string
          user_id: string
          vehicle_params?: Json
        }
        Update: {
          app_settings?: Json
          created_at?: string
          id?: string
          last_saved_at?: string
          license_id?: string
          selected_driver_ids?: string[] | null
          trip_params?: Json
          updated_at?: string
          user_id?: string
          vehicle_params?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trailers: {
        Row: {
          brand: string | null
          created_at: string
          current_km: number | null
          id: string
          is_active: boolean | null
          license_id: string | null
          license_plate: string | null
          local_id: string
          model: string | null
          name: string
          synced_at: string
          trailer_data: Json | null
          trailer_type: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          current_km?: number | null
          id?: string
          is_active?: boolean | null
          license_id?: string | null
          license_plate?: string | null
          local_id: string
          model?: string | null
          name: string
          synced_at?: string
          trailer_data?: Json | null
          trailer_type?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          current_km?: number | null
          id?: string
          is_active?: boolean | null
          license_id?: string | null
          license_plate?: string | null
          local_id?: string
          model?: string | null
          name?: string
          synced_at?: string
          trailer_data?: Json | null
          trailer_type?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_trailers_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vehicles: {
        Row: {
          brand: string | null
          created_at: string
          current_km: number | null
          fuel_consumption: number | null
          fuel_type: string | null
          id: string
          is_active: boolean | null
          license_id: string | null
          license_plate: string | null
          local_id: string
          model: string | null
          name: string
          synced_at: string
          updated_at: string
          user_id: string
          vehicle_data: Json | null
          vehicle_type: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          current_km?: number | null
          fuel_consumption?: number | null
          fuel_type?: string | null
          id?: string
          is_active?: boolean | null
          license_id?: string | null
          license_plate?: string | null
          local_id: string
          model?: string | null
          name: string
          synced_at?: string
          updated_at?: string
          user_id: string
          vehicle_data?: Json | null
          vehicle_type?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          current_km?: number | null
          fuel_consumption?: number | null
          fuel_type?: string | null
          id?: string
          is_active?: boolean | null
          license_id?: string | null
          license_plate?: string | null
          local_id?: string
          model?: string | null
          name?: string
          synced_at?: string
          updated_at?: string
          user_id?: string
          vehicle_data?: Json | null
          vehicle_type?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_vehicles_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clients_safe: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string | null
          license_id: string | null
          name: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: never
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          license_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: never
          postal_code?: string | null
          siret?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: never
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          license_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: never
          postal_code?: string | null
          siret?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      license_addons_safe: {
        Row: {
          activated_at: string | null
          addon_id: string | null
          addon_name: string | null
          created_at: string | null
          deactivated_at: string | null
          id: string | null
          is_active: boolean | null
          license_id: string | null
          monthly_price: number | null
          updated_at: string | null
          yearly_price: number | null
        }
        Insert: {
          activated_at?: string | null
          addon_id?: string | null
          addon_name?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          id?: string | null
          is_active?: boolean | null
          license_id?: string | null
          monthly_price?: never
          updated_at?: string | null
          yearly_price?: never
        }
        Update: {
          activated_at?: string | null
          addon_id?: string | null
          addon_name?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          id?: string | null
          is_active?: boolean | null
          license_id?: string | null
          monthly_price?: never
          updated_at?: string | null
          yearly_price?: never
        }
        Relationships: [
          {
            foreignKeyName: "license_addons_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _auth_set_password: {
        Args: { p_email: string; p_password: string }
        Returns: string
      }
      _central_child_links: {
        Args: never
        Returns: {
          cascades: boolean
          child: string
          col: string
          parent: string
          pcol: string
        }[]
      }
      _central_code: { Args: { p_chars: string }; Returns: string }
      _central_fields: {
        Args: { p_deny: string[]; p_table: string }
        Returns: Json
      }
      _central_log: {
        Args: {
          cfg: Json
          p_action: string
          p_actor: string
          p_details: Json
          p_target: string
        }
        Returns: undefined
      }
      _central_patch: {
        Args: {
          p_deny: string[]
          p_id: string
          p_patch: Json
          p_table: string
          p_where_col: string
        }
        Returns: number
      }
      _company_doc_valid_until: {
        Args: { p_expires: string; p_issued: string; p_kind: string }
        Returns: string
      }
      _company_temp_password: {
        Args: { p_company_user_id: string }
        Returns: string
      }
      _is_last_direction: {
        Args: { p_company_user_id: string }
        Returns: boolean
      }
      _my_role_in: { Args: { p_license_id: string }; Returns: string }
      _plan_cfg: { Args: never; Returns: Json }
      _team_guard: { Args: { p_company_user_id: string }; Returns: string }
      active_announcements: { Args: { p_license_id: string }; Returns: Json }
      admin_add_company_user: {
        Args: {
          p_display_name?: string
          p_email: string
          p_license_id: string
          p_role?: string
        }
        Returns: string
      }
      admin_remove_company_user: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      admin_toggle_company_user_active: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: boolean
      }
      admin_update_company_user_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: boolean
      }
      apply_plan_features: {
        Args: { p_license_id: string }
        Returns: undefined
      }
      can_view_client_sensitive_data: {
        Args: { p_license_id: string }
        Returns: boolean
      }
      can_view_company_members: {
        Args: { p_license_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_financial_data: {
        Args: { p_license_id: string }
        Returns: boolean
      }
      central_admin: {
        Args: { p_action: string; p_payload?: Json; p_secret: string }
        Returns: Json
      }
      central_admin_ext: {
        Args: { p_action: string; p_payload?: Json; p_secret: string }
        Returns: Json
      }
      central_autosuspend: { Args: never; Returns: number }
      central_delete_account: {
        Args: { p_payload: Json; p_secret: string }
        Returns: Json
      }
      central_documents: {
        Args: { p_action: string; p_payload?: Json; p_secret: string }
        Returns: Json
      }
      central_support_session: {
        Args: { p_payload: Json; p_secret: string }
        Returns: Json
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      company_access: { Args: { p_license_id: string }; Returns: Json }
      company_create_user: {
        Args: {
          p_display_name: string
          p_email: string
          p_license_id: string
          p_login_id?: string
          p_role: string
        }
        Returns: Json
      }
      company_delete_user: {
        Args: { p_company_user_id: string }
        Returns: undefined
      }
      company_document_can_upload: {
        Args: { p_license_id: string }
        Returns: boolean
      }
      company_documents_status: {
        Args: { p_license_id: string }
        Returns: Json
      }
      company_password_changed: { Args: never; Returns: undefined }
      company_reset_user_password: {
        Args: { p_company_user_id: string }
        Returns: string
      }
      company_set_user_active: {
        Args: { p_active: boolean; p_company_user_id: string }
        Returns: undefined
      }
      company_set_user_role: {
        Args: { p_company_user_id: string; p_role: string }
        Returns: undefined
      }
      company_slugify: { Args: { p_label: string }; Returns: string }
      company_team: { Args: { p_license_id: string }; Returns: Json }
      company_unique_slug: {
        Args: { p_base: string; p_exclude?: string }
        Returns: string
      }
      complete_company_contact: {
        Args: {
          p_code?: string
          p_email: string
          p_license_id: string
          p_phone: string
          p_user_email?: string
        }
        Returns: Json
      }
      create_access_request: {
        Args: { p_message?: string; p_requested_features: string[] }
        Returns: string
      }
      delete_company_driver: {
        Args: { p_license_id: string; p_local_id: string }
        Returns: boolean
      }
      flow_license_payload: { Args: { p_license_id: string }; Returns: Json }
      forgot_password_issue: { Args: { p_login: string }; Returns: Json }
      get_company_members_safe: {
        Args: never
        Returns: {
          display_name: string
          id: string
          is_active: boolean
          is_current_user: boolean
          role: string
        }[]
      }
      get_drivers_masked: {
        Args: never
        Returns: {
          base_salary: number
          can_view_salary: boolean
          created_at: string
          driver_data: Json
          driver_type: string
          hourly_rate: number
          id: string
          license_id: string
          local_id: string
          name: string
          synced_at: string
          updated_at: string
          user_id: string
        }[]
      }
      get_drivers_with_salary_check: {
        Args: never
        Returns: {
          base_salary: number
          can_view_salary: boolean
          created_at: string
          driver_data: Json
          driver_type: string
          hourly_rate: number
          id: string
          license_id: string
          local_id: string
          name: string
          synced_at: string
          updated_at: string
          user_id: string
        }[]
      }
      get_quotes_masked: {
        Args: never
        Returns: {
          can_view_financials: boolean
          client_id: string
          created_at: string
          destination_address: string
          distance_km: number
          id: string
          license_id: string
          margin_percent: number
          notes: string
          origin_address: string
          price_ht: number
          price_ttc: number
          quote_number: string
          status: string
          stops: Json
          total_cost: number
          tva_rate: number
          updated_at: string
          user_id: string
          valid_until: string
        }[]
      }
      get_safe_invitations: {
        Args: { p_license_id: string }
        Returns: {
          accepted_at: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          is_expired: boolean
          role: string
        }[]
      }
      get_saved_tours_masked: {
        Args: never
        Returns: {
          adblue_cost: number
          can_view_financials: boolean
          category: string
          client_id: string
          created_at: string
          destination_address: string
          distance_km: number
          driver_cost: number
          driver_ids: string[]
          drivers_data: Json
          duration_minutes: number
          fixed_price: number
          fuel_cost: number
          id: string
          is_favorite: boolean
          license_id: string
          mission_order: string
          name: string
          notes: string
          origin_address: string
          price_per_km: number
          pricing_mode: string
          profit: number
          profit_margin: number
          revenue: number
          stops: Json
          structure_cost: number
          tags: string[]
          target_margin: number
          toll_cost: number
          total_cost: number
          trailer_data: Json
          trailer_id: string
          updated_at: string
          user_id: string
          vehicle_cost: number
          vehicle_data: Json
          vehicle_id: string
          vehicle_ids: string[]
          vehicles_data: Json
        }[]
      }
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_trips_masked: {
        Args: never
        Returns: {
          adblue_cost: number
          can_view_financials: boolean
          client_id: string
          created_at: string
          destination_address: string
          destination_lat: number
          destination_lng: number
          distance_km: number
          driver_cost: number
          driver_ids: string[]
          duration_minutes: number
          fuel_cost: number
          id: string
          license_id: string
          notes: string
          origin_address: string
          origin_lat: number
          origin_lng: number
          profit: number
          profit_margin: number
          revenue: number
          status: string
          stops: Json
          structure_cost: number
          toll_cost: number
          total_cost: number
          trip_date: string
          updated_at: string
          user_id: string
          vehicle_data: Json
        }[]
      }
      get_user_license_id: { Args: { p_user_id: string }; Returns: string }
      is_any_direction: { Args: { p_user_id: string }; Returns: boolean }
      is_company_admin: {
        Args: { p_license_id: string; p_user_id: string }
        Returns: boolean
      }
      is_company_financial: {
        Args: { p_license_id: string; p_user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { p_license_id: string; p_user_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { p_license_id: string; p_user_id: string }
        Returns: boolean
      }
      is_company_rh: {
        Args: { p_license_id: string; p_user_id: string }
        Returns: boolean
      }
      license_has_members: { Args: { p_license_id: string }; Returns: boolean }
      link_user_to_company: {
        Args: { p_company_user_id: string; p_user_id: string }
        Returns: boolean
      }
      my_companies: { Args: never; Returns: Json }
      pick_driver_salary_keys: { Args: { p_data: Json }; Returns: Json }
      plan_features_of: { Args: { p_license_id: string }; Returns: Json }
      process_access_request: {
        Args: {
          p_comment?: string
          p_processed_by?: string
          p_request_id: string
          p_status: string
        }
        Returns: boolean
      }
      resolve_company_link: {
        Args: { p_query: string }
        Returns: {
          name: string
          slug: string
        }[]
      }
      resolve_login: { Args: { p_login: string }; Returns: string }
      strip_driver_salary_keys: { Args: { p_data: Json }; Returns: Json }
      support_create: {
        Args: {
          p_body: string
          p_context?: Json
          p_kind: string
          p_license_id: string
          p_page?: string
          p_subject: string
        }
        Returns: string
      }
      support_guest_create: {
        Args: {
          p_body: string
          p_context?: Json
          p_email: string
          p_kind: string
          p_name: string
          p_page?: string
          p_subject: string
        }
        Returns: Json
      }
      support_guest_mark_read: {
        Args: { p_thread_id: string; p_token: string }
        Returns: undefined
      }
      support_guest_reply: {
        Args: { p_body: string; p_thread_id: string; p_token: string }
        Returns: undefined
      }
      support_guest_threads: { Args: { p_items: Json }; Returns: Json }
      support_mark_read: { Args: { p_thread_id: string }; Returns: undefined }
      support_my_threads: { Args: { p_license_id: string }; Returns: Json }
      support_session_claim: { Args: { p_token: string }; Returns: Json }
      support_user_reply: {
        Args: { p_body: string; p_thread_id: string }
        Returns: undefined
      }
      track_page_view: {
        Args: { p_license_id: string; p_path: string }
        Returns: undefined
      }
      update_user_activity: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
