// PATH: src/components/Admin/AchievementVerification.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertCircle,
  FileCheck,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import Card from '../UI/Card';
import Button from '../UI/Button';
import { supabase } from '../../services/supabase';
import { databaseService } from '../../services/database';

interface SubmittedAchievement {
  achievement_id: string;
  user_id: string;
  milestone_id: string;
  evidence_url: string;
  evidence_hash: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  users: {
    name: string;
    email: string;
    wallet_address?: string | null;
    community_id?: string | null;
  } | null;
  milestones: {
    title: string;
    description: string;
    reward_amount: number;
    reward_token: string | null;
    category: string | null;
  } | null;
}

export default function AchievementVerification() {
  const [submissions, setSubmissions] = useState<SubmittedAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmittedAchievement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const pendingCount = useMemo(() => submissions.length, [submissions.length]);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('achievements')
        .select(
          `
          achievement_id,
          user_id,
          milestone_id,
          evidence_url,
          evidence_hash,
          verification_status,
          status,
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

      if (error) {
        throw error;
      }

      setSubmissions((data as SubmittedAchievement[]) ?? []);
    } catch (err) {
      console.error('[AchievementVerification] Failed to fetch submissions:', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  const openDetailModal = (submission: SubmittedAchievement) => {
    setSelectedSubmission(submission);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    if (processingId) return;
    setShowDetailModal(false);
    setSelectedSubmission(null);
  };

  const handleApprove = async (submission: SubmittedAchievement) => {
    const achievementId = submission.achievement_id;
    const recipientUserId = submission.user_id;
    const rewardAmount = submission.milestones?.reward_amount ?? 0;
    const tokenType = submission.milestones?.reward_token ?? 'IMPACT';
    const milestoneTitle = submission.milestones?.title ?? 'Milestone';

    if (!achievementId || !recipientUserId) return;

    try {
      setProcessingId(achievementId);

      const success = await databaseService.updateAchievementStatus(
        achievementId,
        'verified',
        {
          status: 'verified',
        } as any
      );

      if (!success) {
        throw new Error('Failed to update achievement status');
      }

      const createdReward = await databaseService.createReward({
        user_id: recipientUserId,
        achievement_id: achievementId,
        token_amount: rewardAmount,
        token_type: tokenType,
        status: 'pending',
        description: `Achievement verified: ${milestoneTitle}`,
      });

      if (!createdReward) {
        console.warn(
          '[AchievementVerification] Achievement approved, but reward row was not created.'
        );
      }

      await fetchSubmissions();
      closeDetailModal();
    } catch (err) {
      console.error('[AchievementVerification] Failed to approve submission:', err);
      alert('Failed to approve submission. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (achievementId: string) => {
    if (!confirm('Are you sure you want to reject this submission?')) {
      return;
    }

    try {
      setProcessingId(achievementId);

      const success = await databaseService.updateAchievementStatus(
        achievementId,
        'rejected',
        {
          status: 'submitted',
        } as any
      );

      if (!success) {
        throw new Error('Failed to update achievement status');
      }

      await fetchSubmissions();
      closeDetailModal();
    } catch (err) {
      console.error('[AchievementVerification] Failed to reject achievement:', err);
      alert('Failed to reject achievement. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Achievement Verification Queue
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Review and verify submitted achievement evidence
            </p>
          </div>

          <div className="flex items-center space-x-2 rounded-lg bg-yellow-50 px-3 py-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">
              {pendingCount} Pending
            </span>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-400" />
            <h4 className="mb-2 text-lg font-medium text-gray-900">All Caught Up!</h4>
            <p className="text-gray-600">
              No pending achievement verifications at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <motion.div
                key={submission.achievement_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-3">
                      <h4 className="font-semibold text-gray-900">
                        {submission.milestones?.title ?? 'Untitled Milestone'}
                      </h4>

                      <span className="flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                        <Clock className="mr-1 h-3 w-3" />
                        {submission.verification_status ?? 'pending'}
                      </span>
                    </div>

                    <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <p className="flex items-center text-xs text-gray-500">
                          <User className="mr-1 h-3 w-3" />
                          Participant
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {submission.users?.name ?? 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {submission.users?.email ?? 'No email'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">User ID</p>
                        <p className="truncate text-xs font-mono text-gray-900">
                          {submission.user_id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Submitted</p>
                        <p className="text-sm text-gray-900">
                          {formatDistanceToNow(new Date(submission.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 py-2 text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-600">
                          Category:{' '}
                          <span className="font-medium text-gray-900">
                            {submission.milestones?.category ?? 'General'}
                          </span>
                        </span>

                        <span className="text-gray-600">
                          Reward:{' '}
                          <span className="font-medium text-secondary-600">
                            {submission.milestones?.reward_amount ?? 0}{' '}
                            {submission.milestones?.reward_token ?? 'IMPACT'}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center text-xs text-gray-500">
                        <FileCheck className="mr-1 h-3 w-3" />
                        Milestone ID: {submission.milestone_id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetailModal(submission)}
                      disabled={processingId === submission.achievement_id}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <h3 className="mb-4 text-xl font-semibold text-gray-900">
              Review Submission
            </h3>

            <div className="mb-6 space-y-4">
              <div>
                <h4 className="mb-2 font-semibold text-gray-900">
                  {selectedSubmission.milestones?.title ?? 'Untitled Milestone'}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedSubmission.milestones?.description ??
                    'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="mb-1 text-xs text-gray-500">Participant</p>
                  <p className="font-medium text-gray-900">
                    {selectedSubmission.users?.name ?? 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedSubmission.users?.email ?? 'No email'}
                  </p>
                  <p className="mt-1 text-xs font-mono text-gray-500">
                    {selectedSubmission.user_id}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-gray-500">Reward Amount</p>
                  <p className="text-lg font-semibold text-secondary-600">
                    {selectedSubmission.milestones?.reward_amount ?? 0}{' '}
                    {selectedSubmission.milestones?.reward_token ?? 'IMPACT'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">Milestone ID</p>
                  <p className="break-all text-xs font-mono text-gray-900">
                    {selectedSubmission.milestone_id}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center text-sm font-medium text-gray-700">
                  <FileCheck className="mr-2 h-4 w-4" />
                  Submitted Evidence
                </p>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  {selectedSubmission.evidence_url?.startsWith('http') ? (
                    <div>
                      <a
                        href={selectedSubmission.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-blue-600 underline hover:text-blue-700"
                      >
                        {selectedSubmission.evidence_url}
                      </a>
                      <p className="mt-2 text-xs text-gray-600">
                        Click to open evidence in a new tab
                      </p>
                    </div>
                  ) : (
                    <p className="break-all text-gray-900">
                      {selectedSubmission.evidence_url || 'No evidence URL provided'}
                    </p>
                  )}
                </div>

                {selectedSubmission.evidence_hash && (
                  <p className="mt-2 text-xs text-gray-500">
                    Hash:{' '}
                    <span className="font-mono">
                      {selectedSubmission.evidence_hash}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Submission Details
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Workflow Status</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedSubmission.status ?? 'submitted'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Verification Status</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedSubmission.verification_status ?? 'pending'}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Submitted At</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedSubmission.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Updated At</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedSubmission.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div className="text-sm text-yellow-800">
                  <p className="mb-1 font-medium">Verification Instructions</p>
                  <ul className="list-inside list-disc space-y-1 text-xs">
                    <li>Review the submitted evidence carefully.</li>
                    <li>Verify it meets the milestone requirements.</li>
                    <li>Approve sets verification_status to verified.</li>
                    <li>Reject sets verification_status to rejected.</li>
                    <li>
                      Reject does not write status = rejected, because that violates
                      the achievement status constraint.
                    </li>
                    <li>Users can resubmit rejected achievements.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={closeDetailModal}
                disabled={!!processingId}
              >
                Cancel
              </Button>

              <Button
                size="sm"
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
                onClick={() => void handleReject(selectedSubmission.achievement_id)}
                disabled={!!processingId}
              >
                <XCircle className="mr-1 h-4 w-4" />
                {processingId === selectedSubmission.achievement_id
                  ? 'Processing...'
                  : 'Reject'}
              </Button>

              <Button
                size="sm"
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
                onClick={() => void handleApprove(selectedSubmission)}
                disabled={!!processingId}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                {processingId === selectedSubmission.achievement_id
                  ? 'Processing...'
                  : 'Approve'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}