/**
 * @file database.ts
 * @summary Supabase database type definitions for VECTERAI Foundation
 * @dependencies None
 */

/**
 * Database schema types for Supabase
 * Defines the structure of all tables and their relationships
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          wallet_address: string;
          role: 'developer' | 'creator' | 'investor' | 'public';
          legal_shield_status: 'pending' | 'accepted' | 'declined' | 'expired';
          legal_shield_accepted_at: string | null;
          legal_shield_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          role?: 'developer' | 'creator' | 'investor' | 'public';
          legal_shield_status?: 'pending' | 'accepted' | 'declined' | 'expired';
          legal_shield_accepted_at?: string | null;
          legal_shield_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          role?: 'developer' | 'creator' | 'investor' | 'public';
          legal_shield_status?: 'pending' | 'accepted' | 'declined' | 'expired';
          legal_shield_accepted_at?: string | null;
          legal_shield_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      legal_shield_status: 'pending' | 'accepted' | 'declined' | 'expired';
      user_role: 'developer' | 'creator' | 'investor' | 'public';
    };
  };
}

/**
 * Convenience type for profile row
 */
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Convenience type for profile insert
 */
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

/**
 * Convenience type for profile update
 */
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
