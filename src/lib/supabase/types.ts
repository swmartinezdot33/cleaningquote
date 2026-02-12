export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRole = 'admin' | 'member';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; slug: string; created_at: string; updated_at: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; subscription_status: string | null; contact_email: string | null; contact_phone: string | null; office_address: string | null; ghl_location_id: string | null; ghl_token: string | null; ghl_use_oauth: boolean; default_quoter_tool_id: string | null };
        Insert: { id?: string; name: string; slug: string; created_at?: string; updated_at?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; subscription_status?: string | null; contact_email?: string | null; contact_phone?: string | null; office_address?: string | null; ghl_location_id?: string | null; ghl_token?: string | null; ghl_use_oauth?: boolean; default_quoter_tool_id?: string | null };
        Update: { id?: string; name?: string; slug?: string; created_at?: string; updated_at?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; subscription_status?: string | null; contact_email?: string | null; contact_phone?: string | null; office_address?: string | null; ghl_location_id?: string | null; ghl_token?: string | null; ghl_use_oauth?: boolean; default_quoter_tool_id?: string | null };
      };
      organization_members: {
        Row: { id: string; org_id: string; user_id: string; role: OrgRole; created_at: string };
        Insert: { id?: string; org_id: string; user_id: string; role?: OrgRole; created_at?: string };
        Update: { id?: string; org_id?: string; user_id?: string; role?: OrgRole; created_at?: string };
      };
      invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: OrgRole;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: OrgRole;
          token: string;
          invited_by?: string | null;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>;
      };
      tools: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          org_id: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          org_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotes: {
        Row: {
          id: string;
          quote_id: string;
          tool_id: string | null;
          property_id: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          service_type: string | null;
          frequency: string | null;
          price_low: number | null;
          price_high: number | null;
          square_feet: string | null;
          bedrooms: number | null;
          full_baths: number | null;
          half_baths: number | null;
          summary_text: string | null;
          payload: Record<string, unknown>;
          ghl_contact_id: string | null;
          ghl_object_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          tool_id?: string | null;
          property_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          service_type?: string | null;
          frequency?: string | null;
          price_low?: number | null;
          price_high?: number | null;
          square_feet?: string | null;
          bedrooms?: number | null;
          full_baths?: number | null;
          half_baths?: number | null;
          summary_text?: string | null;
          payload?: Record<string, unknown>;
          ghl_contact_id?: string | null;
          ghl_object_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          tool_id?: string | null;
          property_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          service_type?: string | null;
          frequency?: string | null;
          price_low?: number | null;
          price_high?: number | null;
          square_feet?: string | null;
          bedrooms?: number | null;
          full_baths?: number | null;
          half_baths?: number | null;
          summary_text?: string | null;
          payload?: Record<string, unknown>;
          ghl_contact_id?: string | null;
          ghl_object_id?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      tool_config: {
        Row: {
          id: string;
          tool_id: string | null;
          widget_settings: Json | null;
          form_settings: Json | null;
          tracking_codes: Json | null;
          initial_cleaning_config: Json | null;
          google_maps_key: string | null;
          service_area_type: string | null;
          service_area_polygon: Json | null;
          service_area_network_link: string | null;
          survey_questions: Json | null;
          pricing_table: Json | null;
          pricing_structure_id: string | null;
          pricing_network_path: string | null;
          pricing_file_base64: string | null;
          pricing_file_metadata: Json | null;
          ghl_token: string | null;
          ghl_config: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tool_id?: string | null;
          widget_settings?: Json | null;
          form_settings?: Json | null;
          tracking_codes?: Json | null;
          initial_cleaning_config?: Json | null;
          google_maps_key?: string | null;
          service_area_type?: string | null;
          service_area_polygon?: Json | null;
          service_area_network_link?: string | null;
          survey_questions?: Json | null;
          pricing_table?: Json | null;
          pricing_structure_id?: string | null;
          pricing_network_path?: string | null;
          pricing_file_base64?: string | null;
          pricing_file_metadata?: Json | null;
          ghl_token?: string | null;
          ghl_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tool_config']['Insert']>;
      };
      service_areas: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          polygon: Json | null;
          zone_display: Json | null;
          network_link_url: string | null;
          network_link_fetched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          polygon?: Json | null;
          zone_display?: Json | null;
          network_link_url?: string | null;
          network_link_fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          polygon?: Json | null;
          zone_display?: Json | null;
          network_link_url?: string | null;
          network_link_fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tool_service_areas: {
        Row: { tool_id: string; service_area_id: string };
        Insert: { tool_id: string; service_area_id: string };
        Update: { tool_id?: string; service_area_id?: string };
      };
      contacts: {
        Row: {
          id: string;
          org_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          ghl_contact_id: string | null;
          stage: string;
          source: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          ghl_contact_id?: string | null;
          stage?: string;
          source?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
      };
      properties: {
        Row: {
          id: string;
          contact_id: string;
          org_id: string;
          address: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          nickname: string | null;
          stage: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          org_id: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          nickname?: string | null;
          stage?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      service_schedules: {
        Row: {
          id: string;
          property_id: string;
          org_id: string;
          frequency: string;
          preferred_day: string | null;
          preferred_time_slot: string | null;
          price_per_visit: number | null;
          status: string;
          start_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          org_id: string;
          frequency: string;
          preferred_day?: string | null;
          preferred_time_slot?: string | null;
          price_per_visit?: number | null;
          status?: string;
          start_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['service_schedules']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          property_id: string;
          contact_id: string;
          org_id: string;
          service_type: string | null;
          scheduled_at: string;
          duration_minutes: number | null;
          status: string;
          ghl_appointment_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          contact_id: string;
          org_id: string;
          service_type?: string | null;
          scheduled_at: string;
          duration_minutes?: number | null;
          status?: string;
          ghl_appointment_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      activities: {
        Row: {
          id: string;
          contact_id: string;
          org_id: string;
          type: string;
          title: string;
          metadata: Record<string, unknown>;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          contact_id: string;
          org_id: string;
          type: string;
          title: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
      };
      notes: {
        Row: {
          id: string;
          contact_id: string;
          org_id: string;
          content: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          contact_id: string;
          org_id: string;
          content: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];

export type Tool = Database['public']['Tables']['tools']['Row'];
export type ToolInsert = Database['public']['Tables']['tools']['Insert'];
export type ToolUpdate = Database['public']['Tables']['tools']['Update'];

export type Quote = Database['public']['Tables']['quotes']['Row'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];

export type ToolConfigRow = Database['public']['Tables']['tool_config']['Row'];
export type ToolConfigInsert = Database['public']['Tables']['tool_config']['Insert'];
export type ToolConfigUpdate = Database['public']['Tables']['tool_config']['Update'];

export type ServiceAreaRow = Database['public']['Tables']['service_areas']['Row'];
export type ServiceAreaInsert = Database['public']['Tables']['service_areas']['Insert'];
export type ServiceAreaUpdate = Database['public']['Tables']['service_areas']['Update'];

export type ToolServiceAreaRow = Database['public']['Tables']['tool_service_areas']['Row'];
export type ToolServiceAreaInsert = Database['public']['Tables']['tool_service_areas']['Insert'];
