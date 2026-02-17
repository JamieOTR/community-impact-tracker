import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import ImpactMetrics from '../components/Dashboard/ImpactMetrics';
import DatabaseMilestones from '../components/Dashboard/DatabaseMilestones';
import DatabaseTokenBalance from '../components/Dashboard/DatabaseTokenBalance';
import Leaderboard from '../components/Dashboard/Leaderboard';
import RealTimeMetrics from '../components/Dashboard/RealtimeMetrics';
import AdvancedCharts from '../components/Dashboard/AdvancedCharts';
import WalletConnect from '../components/Blockchain/WalletConnect';
import { useAuth } from '../hooks/useAuth';
import { ensureSampleDataExists } from '../services/sampleData';

export default function Dashboard() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Ensure sample data exists for demo purposes
    ensureSampleDataExists();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to Community Impact Tracker</h2>
          <p className="text-gray-600">Please sign in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.name.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                Let's continue making a positive impact in your community.
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Impact Score</p>
                <p className="text-2xl font-bold text-primary-600">{user.total_impact_score.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Real-time Metrics */}
        <div className="mb-8">
          <RealTimeMetrics />
        </div>

        {/* Impact Metrics */}
        <div className="mb-8">
          <ImpactMetrics />
        </div>

        {/* Advanced Charts */}
        <div className="mb-8">
          <AdvancedCharts />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Milestones */}
          <div className="lg:col-span-2 space-y-8">
            <DatabaseMilestones />
          </div>

          {/* Right Column - Token Balance, Wallet & Leaderboard */}
          <div className="space-y-8">
            <WalletConnect />
            <DatabaseTokenBalance />
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}