import { useState, useEffect } from 'react';
import {
  databaseService,
  type User,
  type Milestone,
  type Achievement,
  type Reward,
  type Community,
  type Program,
} from '../services/database';

export function useUserData(userId?: string) {
  const [user, setUser] = useState<User | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadUserData(userId);
    }
  }, [userId]);

  const loadUserData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const [userData, communityData] = await Promise.all([
        databaseService.getCurrentUser(),
        databaseService.getUserCommunity(id),
      ]);

      setUser(userData);
      setCommunity(communityData);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  return { user, community, loading, error, refetch: () => userId && loadUserData(userId) };
}

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await databaseService.getPrograms();
      setPrograms(data);
    } catch (err) {
      console.error('Error loading programs:', err);
      setError('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  return { programs, loading, error, refetch: loadPrograms };
}

export function useMilestones(userId?: string) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMilestones();
  }, [userId]);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await databaseService.getMilestones(userId);
      setMilestones(data);
    } catch (err) {
      console.error('Error loading milestones:', err);
      setError('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  return { milestones, loading, error, refetch: loadMilestones };
}

export function useAchievements(userId: string) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadAchievements();
    }
  }, [userId]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await databaseService.getUserAchievements(userId);
      setAchievements(data);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  return { achievements, loading, error, refetch: loadAchievements };
}

export function useRewards(userId: string) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadRewards();
    }
  }, [userId]);

  const loadRewards = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await databaseService.getUserRewards(userId);
      setRewards(data);
    } catch (err) {
      console.error('Error loading rewards:', err);
      setError('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  return { rewards, loading, error, refetch: loadRewards };
}