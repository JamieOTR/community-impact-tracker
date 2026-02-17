import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Target, Zap, RefreshCw } from 'lucide-react';
import Card from '../UI/Card';
import { supabase } from '../../services/supabase';

interface MetricData {
  totalUsers: number;
  activeMilestones: number;
  tokensDistributed: number;
  communityGrowth: number;
  lastUpdated: Date;
}

export default function RealtimeMetrics() {
  const [metrics, setMetrics] = useState<MetricData>({
    totalUsers: 10247,
    activeMilestones: 1856,
    tokensDistributed: 250000,
    communityGrowth: 12.5,
    lastUpdated: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('metrics_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' },
        () => fetchMetrics()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'achievements' },
        () => fetchMetrics()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch real metrics from database
      const [usersResult, achievementsResult, rewardsResult] = await Promise.all([
        supabase.from('users').select('user_id', { count: 'exact', head: true }),
        supabase.from('achievements').select('achievement_id', { count: 'exact', head: true }),
        supabase.from('rewards').select('token_amount').eq('status', 'confirmed')
      ]);

      const totalTokens = rewardsResult.data?.reduce((sum, reward) => sum + reward.token_amount, 0) || 0;

      setMetrics({
        totalUsers: usersResult.count || 0,
        activeMilestones: achievementsResult.count || 0,
        tokensDistributed: totalTokens,
        communityGrowth: 12.5, // This would be calculated based on time-series data
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      change: `+${metrics.communityGrowth}%`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Milestones',
      value: metrics.activeMilestones.toLocaleString(),
      change: '+8.2%',
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Tokens Distributed',
      value: `${(metrics.tokensDistributed / 1000).toFixed(0)}K`,
      change: '+15.3%',
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Growth Rate',
      value: `${metrics.communityGrowth}%`,
      change: '+2.1%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Real-time Metrics</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {metrics.lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`inline-flex p-2 rounded-lg ${metric.bgColor} mb-3`}>
                    <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-green-600">{metric.change}</span>
                    <span className="text-xs text-gray-500">vs last month</span>
                  </div>
                </div>
              </div>
              
              {/* Animated background effect */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1, delay: index * 0.2 }}
              />
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}