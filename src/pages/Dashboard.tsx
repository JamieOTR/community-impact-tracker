import React, { Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { ensureSampleDataExists } from '../services/sampleData';

// Option A: lazy-load dashboard panels for code-splitting + faster initial paint
const ImpactMetrics = React.lazy(() => import('../components/Dashboard/ImpactMetrics'));
const DatabaseMilestones = React.lazy(() => import('../components/Dashboard/DatabaseMilestones'));
const DatabaseTokenBalance = React.lazy(() => import('../components/Dashboard/DatabaseTokenBalance'));
const Leaderboard = React.lazy(() => import('../components/Dashboard/Leaderboard'));
const RealTimeMetrics = React.lazy(() => import('../components/Dashboard/RealtimeMetrics'));
const AdvancedCharts = React.lazy(() => import('../components/Dashboard/AdvancedCharts'));
const WalletConnect = React.lazy(() => import('../components/Blockchain/WalletConnect'));

function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">{label}</p>
      </div>
    </div>
  );
}

function PanelLoader({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600">Loading {label}…</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Best-practice: only create demo/sample data when NOT authenticated.
    // This avoids hammering the DB on every dashboard mount for real users.
    if (!user) {
      ensureSampleDataExists().catch((err) => {
        console.warn('ensureSampleDataExists failed (non-fatal):', err);
      });
    }
  }, [user]);

  if (loading) return <FullPageLoader label="Loading your dashboard..." />;

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.name.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-600 mt-1">Let's continue making a positive impact in your community.</p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Impact Score</p>
                <p className="text-2xl font-bold text-primary-600">
                  {user.total_impact_score.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Real-time Metrics */}
        <div className="mb-8">
          <Suspense fallback={<PanelLoader label="Real-time metrics" />}>
            <RealTimeMetrics />
          </Suspense>
        </div>

        {/* Impact Metrics */}
        <div className="mb-8">
          <Suspense fallback={<PanelLoader label="Impact metrics" />}>
            <ImpactMetrics />
          </Suspense>
        </div>

        {/* Advanced Charts */}
        <div className="mb-8">
          <Suspense fallback={<PanelLoader label="Charts" />}>
            <AdvancedCharts />
          </Suspense>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Milestones */}
          <div className="lg:col-span-2 space-y-8">
            <Suspense fallback={<PanelLoader label="Milestones" />}>
              <DatabaseMilestones />
            </Suspense>
          </div>

          {/* Right Column - Token Balance, Wallet & Leaderboard */}
          <div className="space-y-8">
            <Suspense fallback={<PanelLoader label="Wallet" />}>
              <WalletConnect />
            </Suspense>

            <Suspense fallback={<PanelLoader label="Token balance" />}>
              <DatabaseTokenBalance />
            </Suspense>

            <Suspense fallback={<PanelLoader label="Leaderboard" />}>
              <Leaderboard />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
