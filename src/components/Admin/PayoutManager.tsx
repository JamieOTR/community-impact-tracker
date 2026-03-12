// PATH: src/components/Admin/PayoutManager.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

import Card from '../UI/Card';
import Button from '../UI/Button';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

type RewardRow = {
  reward_id: string;
  user_id: string;
  achievement_id: string | null;
  token_amount: number;
  token_type: string | null;
  status: string | null;
  description: string | null;
  approved_at: string | null;
  approved_by: string | null;
  wallet_address: string | null;
  community_id: string | null;

  paid_at?: string | null;
  tx_hash?: string | null;
  network?: string | null;

  users?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

const NETWORK_OPTIONS = [
  'Ethereum',
  'Polygon',
  'BSC',
  'Arbitrum',
  'Optimism',
  'Base',
  'Solana',
];

function short(s: string, head = 6, tail = 4) {
  if (!s) return '';
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

export default function PayoutManager() {
  const { user: adminUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RewardRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<RewardRow | null>(null);
  const [network, setNetwork] = useState<string>('Ethereum');
  const [txHash, setTxHash] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [markStatus, setMarkStatus] = useState<'paid' | 'confirmed'>('paid');
  const [submitting, setSubmitting] = useState(false);

  const pendingCount = useMemo(
    () => rows.filter((r) => (r.status ?? '') === 'pending').length,
    [rows]
  );

  useEffect(() => {
    void loadPending();
  }, []);

  const loadPending = async () => {
    try {
      setLoading(true);
      setError(null);

      // Pull pending rewards (join users for visibility)
      const { data, error: qErr } = await supabase
        .from('rewards')
        .select(
          `
          reward_id,
          user_id,
          achievement_id,
          token_amount,
          token_type,
          status,
          description,
          approved_at,
          approved_by,
          wallet_address,
          community_id,
          paid_at,
          tx_hash,
          network,
          users (name, email)
        `
        )
        .eq('status', 'pending')
        .order('approved_at', { ascending: true });

      if (qErr) throw qErr;

      setRows((data as RewardRow[]) ?? []);
    } catch (e: any) {
      console.error('[PayoutManager] loadPending error:', e);
      setError(e?.message || 'Failed to load pending rewards');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (r: RewardRow) => {
    setSelected(r);
    setNetwork(r.network ?? 'Ethereum');
    setTxHash(r.tx_hash ?? '');
    setWalletAddress(r.wallet_address ?? '');
    setMarkStatus('paid');
  };

  const validate = (): string | null => {
    if (!adminUser?.user_id) return 'Admin session not available. Please sign in again.';
    if (!selected?.reward_id) return 'No reward selected.';
    if (!network.trim()) return 'Network is required.';
    if (!txHash.trim()) return 'Transaction hash is required.';
    // We keep wallet optional because some flows may not capture it immediately.
    return null;
  };

  const processPayout = async () => {
    const v = validate();
    if (v) {
      alert(v);
      return;
    }

    try {
      setSubmitting(true);

      // 1) Call the database function (atomic + idempotent)
      const { data, error: fnErr } = await supabase.rpc('process_reward_payout', {
        p_reward_id: selected!.reward_id,
        p_tx_hash: txHash.trim(),
        p_network: network.trim(),
        p_wallet_address: walletAddress.trim() || null,
        p_mark_status: markStatus,
      });

      if (fnErr) throw fnErr;

      // 2) Refresh list
      await loadPending();

      // 3) Close modal
      setSelected(null);
      setTxHash('');
      setWalletAddress('');
      setNetwork('Ethereum');
      setMarkStatus('paid');

      console.log('[PayoutManager] payout processed:', data);
    } catch (e: any) {
      console.error('[PayoutManager] processPayout error:', e);
      alert(e?.message || 'Failed to process payout');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payout Manager</h3>
            <p className="text-sm text-gray-600 mt-1">
              Operational control point: mark approved rewards as paid/confirmed and update token balances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg text-sm bg-yellow-50 text-yellow-800">
              {pendingCount} pending
            </span>
            <Button variant="outline" size="sm" onClick={() => void loadPending()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-gray-700 font-medium">No pending rewards</p>
            <p className="text-sm text-gray-500">Approved rewards will appear here until paid.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <motion.div
                key={r.reward_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-50 text-yellow-700">
                        Pending
                      </span>
                      <span className="text-sm text-gray-500">
                        Reward ID: <span className="font-mono">{short(r.reward_id, 8, 6)}</span>
                      </span>
                    </div>

                    <div className="text-sm text-gray-900 font-medium">
                      {r.users?.name ?? 'Unknown user'}{' '}
                      <span className="text-gray-500 font-normal">({r.users?.email ?? 'no email'})</span>
                    </div>

                    <div className="mt-2 text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Amount:{' '}
                        <span className="font-semibold">
                          {Number(r.token_amount).toLocaleString()} {r.token_type ?? 'IMPACT'}
                        </span>
                      </span>
                      <span>
                        Approved:{' '}
                        <span className="font-medium">
                          {r.approved_at ? new Date(r.approved_at).toLocaleString() : '—'}
                        </span>
                      </span>
                      <span>
                        Wallet:{' '}
                        <span className="font-mono">{r.wallet_address ? short(r.wallet_address, 10, 6) : '—'}</span>
                      </span>
                      <span>
                        Network:{' '}
                        <span className="font-medium">{r.network ?? '—'}</span>
                      </span>
                    </div>

                    {r.description && <div className="mt-2 text-xs text-gray-500">{r.description}</div>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => openModal(r)}>
                      Process Payout
                    </Button>
                    {r.tx_hash && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(r.tx_hash!)}
                      >
                        Copy Tx
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Process Payout</h3>
            <p className="text-sm text-gray-600 mb-4">
              This action will mark the reward <span className="font-semibold">paid/confirmed</span> and increment the
              user’s stored <span className="font-semibold">token_balance</span>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Network</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                >
                  {NETWORK_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">Transaction Hash</label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono"
                  placeholder="0x..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Wallet Address (optional)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono"
                  placeholder="0x... (or Solana address)"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Mark Status</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={markStatus}
                  onChange={(e) => setMarkStatus(e.target.value as 'paid' | 'confirmed')}
                >
                  <option value="paid">paid</option>
                  <option value="confirmed">confirmed</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Use <span className="font-medium">paid</span> for “sent”,{' '}
                  <span className="font-medium">confirmed</span> for final settlement.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={submitting}
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" disabled={submitting} onClick={() => void processPayout()}>
                  {submitting ? 'Processing...' : 'Apply Payout'}
                </Button>
              </div>

              {txHash.trim() && (
                <div className="pt-2 text-xs text-gray-500 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Tip: open your preferred explorer for the selected network to validate the tx hash.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}