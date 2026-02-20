// PATH: src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import ImpactMetrics from '../components/Dashboard/ImpactMetrics';
import DatabaseMilestones from '../components/Dashboard/DatabaseMilestones';
import DatabaseTokenBalance from '../components/Dashboard/DatabaseTokenBalance';
import { useAuth } from '../hooks/useAuth';
import { ensureSampleDataExists } from '../services/sampleData';

/**
 * Lazy-load heavy panels to improve FCP/LCP.
 * These components tend to pull large deps (recharts, framer-motion, supabase, blockchain libs).
 */
const RealTimeMetrics = React.lazy(() => import('../components/Dashboard/RealtimeMetrics'));
const AdvancedCharts = React.lazy(() => import('../components/Dashboard/AdvancedCharts'));
const Leaderboard = React.lazy(() => import('../components/Dashboard/Leaderboard'));
const WalletConnect = React.lazy(() => import('../components/Blockchain/WalletConnect'));

/**
 * Defer helper:
 * - Uses requestIdleCallback when available (best)
 * - Falls back to setTimeout(0)
 */
function defer(fn: () => void, timeout = 1200) {
  const w: any = window as any;

  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }

  const t = window.setTimeout(fn, 0);
  return () => window.clearTimeout(t);
}

function PanelSkeleton({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-11/12 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-10/12 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-9/12 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="mt-5 h-36 w-full bg-gray-50 rounded animate-pulse" />
      <div className="mt-2 text-xs text-gray-400">{title}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();

  // Flags to control when heavy panels mount
  const [showRealtime, setShowRealtime] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    // Ensure sample data exists for demo purposes (non-blocking)
    // NOTE: If ensureSampleDataExists triggers network calls, it can slow first render.
    // We defer it so the initial paint happens sooner.
    const cancel = defer(() => {
      ensureSampleDataExists().catch(() => {
        // do not crash dashboard if demo seeding fails
      });
    });

    return cancel;
  }, []);

  useEffect(() => {
    // Mount heavy panels after initial paint (best-practice for dashboards).
    // Order matters: realtime first, then wallet/leaderboard, charts last (charts are typically largest).
    const cancels: Array<() => void> = [];

    cancels.push(
      defer(() => setShowRealtime(true), 800)
    );

    cancels.push(
      defer(() => setShowWallet(true), 1200)
    );

    cancels.push(
      defer(() => setShowLeaderboard(true), 1400)
    );

    cancels.push(
      defer(() => setShowCharts(true), 1800)
    );

    return () => {
      cancels.forEach((c) => c?.());
    };
  }, []);

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return 'there';
    return n.split(/\s+/)[0];
  }, [user?.name]);

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
                Welcome back, {firstName}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                Let&apos;s continue making a positive impact in your community.
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Impact Score</p>
                <p className="text-2xl font-bold text-primary-600">
                  {Number(user.total_impact_score || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Real-time Metrics (deferred + lazy) */}
        <div className="mb-8">
          {showRealtime ? (
            <Suspense fallback={<PanelSkeleton title="Loading real-time metrics…" />}>
              <RealTimeMetrics />
            </Suspense>
          ) : (
            <PanelSkeleton title="Real-time metrics queued…" />
          )}
        </div>

        {/* Impact Metrics (keep eager; assumed lightweight and “above the fold” value) */}
        <div className="mb-8">
          <ImpactMetrics />
        </div>

        {/* Advanced Charts (deferred + lazy; usually the heaviest bundle) */}
        <div className="mb-8">
          {showCharts ? (
            <Suspense fallback={<PanelSkeleton title="Loading charts…" />}>
              <AdvancedCharts />
            </Suspense>
          ) : (
            <PanelSkeleton title="Charts queued (idle-load)…" />
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Milestones (keep eager; primary dashboard utility) */}
          <div className="lg:col-span-2 space-y-8">
            <DatabaseMilestones />
          </div>

          {/* Right Column - Wallet, Token Balance, Leaderboard (wallet + leaderboard deferred) */}
          <div className="space-y-8">
            {showWallet ? (
              <Suspense fallback={<PanelSkeleton title="Loading wallet module…" />}>
                <WalletConnect />
              </Suspense>
            ) : (
              <PanelSkeleton title="Wallet module queued…" />
            )}

            <DatabaseTokenBalance />

            {showLeaderboard ? (
              <Suspense fallback={<PanelSkeleton title="Loading leaderboard…" />}>
                <Leaderboard />
              </Suspense>
            ) : (
              <PanelSkeleton title="Leaderboard queued…" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}