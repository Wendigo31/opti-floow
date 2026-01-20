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
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          quote_conditions?: string | null
          quote_footer?: string | null
          siret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_users: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          last_activity_at: string | null
          license_id: string
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          license_id: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          license_id?: string
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
          company_name: string | null
          company_status: string | null
          created_at: string
          email: string
          employee_count: number | null
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          last_used_at: string | null
          license_code: string
          max_clients: number | null
          max_daily_charges: number | null
          max_drivers: number | null
          max_monthly_charges: number | null
          max_users: number | null
          max_yearly_charges: number | null
          next_billing_date: string | null
          notes: string | null
          plan_type: string | null
          postal_code: string | null
          show_address_info: boolean | null
          show_company_info: boolean | null
          show_license_info: boolean | null
          show_user_info: boolean | null
          siren: string | null
        }
        Insert: {
          activated_at?: string | null
          addons_monthly_total?: number | null
          address?: string | null
          base_monthly_price?: number | null
          billing_period?: string | null
          city?: string | null
          company_name?: string | null
          company_status?: string | null
          created_at?: string
          email: string
          employee_count?: number | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          last_used_at?: string | null
          license_code: string
          max_clients?: number | null
          max_daily_charges?: number | null
          max_drivers?: number | null
          max_monthly_charges?: number | null
          max_users?: number | null
          max_yearly_charges?: number | null
          next_billing_date?: string | null
          notes?: string | null
          plan_type?: string | null
          postal_code?: string | null
          show_address_info?: boolean | null
          show_company_info?: boolean | null
          show_license_info?: boolean | null
          show_user_info?: boolean | null
          siren?: string | null
        }
        Update: {
          activated_at?: string | null
          addons_monthly_total?: number | null
          address?: string | null
          base_monthly_price?: number | null
          billing_period?: string | null
          city?: string | null
          company_name?: string | null
          company_status?: string | null
          created_at?: string
          email?: string
          employee_count?: number | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          last_used_at?: string | null
          license_code?: string
          max_clients?: number | null
          max_daily_charges?: number | null
          max_drivers?: number | null
          max_monthly_charges?: number | null
          max_users?: number | null
          max_yearly_charges?: number | null
          next_billing_date?: string | null
          notes?: string | null
          plan_type?: string | null
          postal_code?: string | null
          show_address_info?: boolean | null
          show_company_info?: boolean | null
          show_license_info?: boolean | null
          show_user_info?: boolean | null
          siren?: string | null
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
        }
        Insert: {
          adblue_cost?: number
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
        }
        Update: {
          adblue_cost?: number
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
        }
        Relationships: [
          {
            foreignKeyName: "saved_tours_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
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
      admin_update_company_user_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_access_request: {
        Args: { p_message?: string; p_requested_features: string[] }
        Returns: string
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
      get_user_license_id: { Args: { p_user_id: string }; Returns: string }
      is_company_admin: {
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
      license_has_members: { Args: { p_license_id: string }; Returns: boolean }
      link_user_to_company: {
        Args: { p_company_user_id: string; p_user_id: string }
        Returns: boolean
      }
      process_access_request: {
        Args: {
          p_comment?: string
          p_processed_by?: string
          p_request_id: string
          p_status: string
        }
        Returns: boolean
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
    Enums: {},
  },
} as const
