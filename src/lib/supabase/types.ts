export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tools: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          tool_id?: string | null;
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
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          tool_id?: string | null;
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
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tool = Database['public']['Tables']['tools']['Row'];
export type ToolInsert = Database['public']['Tables']['tools']['Insert'];
export type ToolUpdate = Database['public']['Tables']['tools']['Update'];

export type Quote = Database['public']['Tables']['quotes']['Row'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
