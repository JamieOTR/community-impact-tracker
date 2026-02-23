import React, { useCallback, useEffect, useState } from 'react';

import CommunityReferralManager from '../components/Admin/CommunityReferralManager';
import AchievementVerification from '../components/Admin/AchievementVerification';

import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/database';

interface Community {
  community_id: string;
  name: string;
  description: string;
  member_count: number;
  referral_code: string;
  created_at: string;
}

interface CommunityStats {
  totalMembers: number;
  activePrograms: number;
  totalRewards: number;
  completedMilestones: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [_stats, setStats] = useState<CommunityStats>({
    totalMembers: 0,
    activePrograms: 0,
    totalRewards: 0,
    completedMilestones: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCommunityData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { data } = await supabase
        .from('communities')
        .select('*')
        .eq('admin_id', user.user_id)
        .single();

      if (data) {
        setCommunity(data);

        const communityStats = await databaseService.getCommunityStats(data.community_id);
        setStats(communityStats);
      } else {
        setCommunity(null);
      }
    } catch (_err) {
      console.error('Failed to fetch community data');
      setCommunity(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCommunity(null);
      setIsLoading(false);
      return;
    }

    void fetchCommunityData();
  }, [user, fetchCommunityData]);

  if (isLoading) return <div>Loading admin dashboard...</div>;
  if (!community) return <div>No Community Found</div>;

  return (
    <div>
      <h1>Community Admin Dashboard</h1>
      <p>Managing {community.name}</p>

      <CommunityReferralManager
        communityId={community.community_id}
        referralCode={community.referral_code}
      />

      <AchievementVerification />
    </div>
  );
}