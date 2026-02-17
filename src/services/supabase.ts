import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          wallet_address: string | null;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          token_balance: number;
          total_impact_score: number;
          community_id: string | null;
          auth_user_id: string;
        };
        Insert: {
          user_id?: string;
          wallet_address?: string | null;
          email: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          token_balance?: number;
          total_impact_score?: number;
          community_id?: string | null;
          auth_user_id: string;
        };
        Update: {
          user_id?: string;
          wallet_address?: string | null;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          token_balance?: number;
          total_impact_score?: number;
          community_id?: string | null;
          auth_user_id?: string;
        };
      };
      communities: {
        Row: {
          community_id: string;
          name: string;
          description: string | null;
          admin_id: string | null;
          created_at: string;
          updated_at: string;
          blockchain_address: string | null;
          member_count: number;
          referral_code: string | null;
        };
        Insert: {
          community_id?: string;
          name: string;
          description?: string | null;
          admin_id?: string | null;
          created_at?: string;
          updated_at?: string;
          blockchain_address?: string | null;
          member_count?: number;
          referral_code?: string | null;
        };
        Update: {
          community_id?: string;
          name?: string;
          description?: string | null;
          admin_id?: string | null;
          created_at?: string;
          updated_at?: string;
          blockchain_address?: string | null;
          member_count?: number;
          referral_code?: string | null;
        };
      };
      milestones: {
        Row: {
          milestone_id: string;
          title: string;
          description: string | null;
          reward_amount: number;
          reward_token: string;
          verification_type: string;
          program_id: string | null;
          created_at: string;
          updated_at: string;
          completion_criteria: any;
          category: string | null;
          difficulty: string | null;
          deadline: string | null;
          requirements: string[] | null;
        };
      };
      achievements: {
        Row: {
          achievement_id: string;
          user_id: string;
          milestone_id: string;
          completed_at: string;
          evidence_hash: string | null;
          evidence_url: string | null;
          verification_status: string;
          transaction_hash: string | null;
          progress: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          achievement_id?: string;
          user_id: string;
          milestone_id: string;
          completed_at?: string;
          evidence_hash?: string | null;
          evidence_url?: string | null;
          verification_status?: string;
          transaction_hash?: string | null;
          progress?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      interactions: {
        Row: {
          interaction_id: string;
          user_id: string;
          message: string;
          ai_response: string;
          timestamp: string;
          context_type: string | null;
          session_id: string | null;
        };
        Insert: {
          interaction_id?: string;
          user_id: string;
          message: string;
          ai_response: string;
          timestamp?: string;
          context_type?: string | null;
          session_id?: string | null;
        };
      };
    };
    Functions: {
      join_community_with_code: {
        Args: {
          _referral_code: string;
          _user_id: string;
        };
        Returns: {
          community_id: string;
          name: string;
          description: string;
          admin_id: string;
        }[];
      };
    };
  };
};
