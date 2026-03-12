// PATH: src/services/database.ts
import { supabase } from './supabase';
import type { Database } from './supabase';

export type User = Database['public']['Tables']['users']['Row'];
export type Community = Database['public']['Tables']['communities']['Row'];
export type Program = Database['public']['Tables']['programs']['Row'];
export type Milestone = Database['public']['Tables']['milestones']['Row'];
export type Achievement = Database['public']['Tables']['achievements']['Row'];
export type Reward = Database['public']['Tables']['rewards']['Row'];
export type Interaction = Database['public']['Tables']['interactions']['Row'];

export class DatabaseService {
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[getCurrentUser] session error:', sessionError);
        return null;
      }

      const authUserId = sessionData.session?.user?.id;
      if (!authUserId) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) {
        console.error('[getCurrentUser] query error:', error);
        return null;
      }

      return data ?? null;
    } catch (error) {
      console.error('[getCurrentUser] unexpected error:', error);
      return null;
    }
  }

  async createUser(userData: {
    email: string;
    name: string;
    auth_user_id: string;
    avatar_url?: string;
  }): Promise<User | null> {
    try {
      const { data, error } = await supabase.from('users').insert(userData).select().single();

      if (error) {
        console.error('[createUser] Error creating user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[createUser] unexpected error:', error);
      return null;
    }
  }

  async getUserCommunity(userId: string): Promise<Community | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          community_id,
          communities (*)
        `
        )
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data?.communities) return null;

      return data.communities as unknown as Community;
    } catch (error) {
      console.error('[getUserCommunity] Error fetching user community:', error);
      return null;
    }
  }

  async createCommunity(communityData: {
    name: string;
    description?: string;
    admin_id: string;
  }): Promise<Community | null> {
    try {
      const { data, error } = await supabase
        .from('communities')
        .insert(communityData)
        .select()
        .single();

      if (error) {
        console.error('[createCommunity] Error creating community:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[createCommunity] unexpected error:', error);
      return null;
    }
  }

  async getPrograms(): Promise<Program[]> {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[getPrograms] Error fetching programs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[getPrograms] unexpected error:', error);
      return [];
    }
  }

  async getMilestones(_userId?: string): Promise<Milestone[]> {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select(
          `
          *,
          programs (
            name,
            community_id,
            communities (name)
          )
        `
        );

      if (error) {
        console.error('[getMilestones] Error fetching milestones:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[getMilestones] unexpected error:', error);
      return [];
    }
  }

  async createMilestone(milestoneData: {
    title: string;
    description?: string;
    reward_amount: number;
    verification_type: string;
    program_id?: string;
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    deadline?: string;
    requirements?: string[];
  }): Promise<Milestone | null> {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .insert(milestoneData)
        .select()
        .single();

      if (error) {
        console.error('[createMilestone] Error creating milestone:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[createMilestone] unexpected error:', error);
      return null;
    }
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select(
          `
          *,
          milestones (
            title,
            description,
            reward_amount,
            reward_token,
            category
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[getUserAchievements] Error fetching achievements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[getUserAchievements] unexpected error:', error);
      return [];
    }
  }

  async getUserAchievementsByMilestones(
    userId: string,
    milestoneIds: string[]
  ): Promise<Achievement[]> {
    try {
      if (milestoneIds.length === 0) return [];

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .in('milestone_id', milestoneIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[getUserAchievementsByMilestones] Error fetching achievements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[getUserAchievementsByMilestones] unexpected error:', error);
      return [];
    }
  }

  async createAchievement(achievementData: {
    user_id: string;
    milestone_id: string;
    evidence_url?: string;
    evidence_hash?: string;
    progress?: number;
    status?: string;
  }): Promise<Achievement | null> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .insert(achievementData)
        .select()
        .single();

      if (error) {
        console.error('[createAchievement] Error creating achievement:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[createAchievement] unexpected error:', error);
      return null;
    }
  }

  async getPendingAchievements(communityId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('achievements')
        .select(
          `
          achievement_id,
          user_id,
          milestone_id,
          evidence_url,
          evidence_hash,
          status,
          verification_status,
          created_at,
          updated_at,
          users (
            name,
            email,
            wallet_address,
            community_id
          ),
          milestones (
            title,
            description,
            reward_amount,
            reward_token,
            category
          )
        `
        )
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });

      if (communityId) {
        query = query.eq('users.community_id', communityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[getPendingAchievements] Error fetching pending achievements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[getPendingAchievements] unexpected error:', error);
      return [];
    }
  }

  async updateAchievementStatus(
    achievementId: string,
    status: 'pending' | 'verified' | 'rejected',
    additionalData?: Partial<Achievement>
  ): Promise<boolean> {
    try {
      const updateData = {
        verification_status: status,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      const { error } = await supabase
        .from('achievements')
        .update(updateData)
        .eq('achievement_id', achievementId);

      if (error) {
        console.error('[updateAchievementStatus] Error updating achievement status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[updateAchievementStatus] unexpected error:', error);
      return false;
    }
  }

  async getUserRewards(userId: string): Promise<Reward[]> {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', userId)
        .order('distributed_at', { ascending: false });

      if (error) {
        console.error('[getUserRewards] Error fetching rewards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[getUserRewards] unexpected error:', error);
      return [];
    }
  }

  async createReward(rewardData: {
    user_id: string;
    achievement_id?: string;
    token_amount: number;
    token_type?: string;
    description: string;
    status?: string;
  }): Promise<Reward | null> {
    try {
      const { data, error } = await supabase.from('rewards').insert(rewardData).select().single();

      if (error) {
        console.error('[createReward] Error creating reward:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[createReward] unexpected error:', error);
      return null;
    }
  }

  async logInteraction(interactionData: {
    user_id: string;
    message: string;
    ai_response: string;
    context_type?: string;
    session_id?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('interactions').insert(interactionData);

      if (error) {
        console.error('[logInteraction] Error logging interaction:', error);
      }
    } catch (error) {
      console.error('[logInteraction] unexpected error:', error);
    }
  }

  async getCommunityStats(communityId: string) {
    try {
      const [usersResult, programsResult, achievementsResult, rewardsResult] = await Promise.all([
        supabase
          .from('users')
          .select('user_id', { count: 'exact', head: true })
          .eq('community_id', communityId),
        supabase
          .from('programs')
          .select('program_id', { count: 'exact', head: true })
          .eq('community_id', communityId),
        supabase
          .from('achievements')
          .select('achievement_id', { count: 'exact', head: true })
          .eq('verification_status', 'verified'),
        supabase.from('rewards').select('token_amount').eq('status', 'confirmed'),
      ]);

      const totalTokens =
        rewardsResult.data?.reduce((sum, reward) => sum + (reward.token_amount || 0), 0) || 0;

      return {
        totalMembers: usersResult.count || 0,
        activePrograms: programsResult.count || 0,
        completedMilestones: achievementsResult.count || 0,
        totalRewards: totalTokens,
      };
    } catch (error) {
      console.error('[getCommunityStats] Error fetching community stats:', error);
      return {
        totalMembers: 0,
        activePrograms: 0,
        completedMilestones: 0,
        totalRewards: 0,
      };
    }
  }
}

export const databaseService = new DatabaseService();