// PATH: src/pages/ProgramDetail.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Coins,
  Users,
  Target,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Clock,
} from 'lucide-react';

import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import SubmissionModal from '../components/Achievement/SubmissionModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import {
  type Achievement,
  type Milestone,
  type Program,
} from '../services/database';

type MilestoneWithAchievement = Milestone & {
  userAchievement?: Achievement | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function statusClasses(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'draft':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'paused':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

function difficultyClasses(value?: string | null) {
  switch ((value || '').toLowerCase()) {
    case 'easy':
      return 'bg-green-100 text-green-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'hard':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [program, setProgram] = useState<Program | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  const milestoneCount = useMemo(() => milestones.length, [milestones]);

  const loadProgramDetail = useCallback(async () => {
    if (!id) {
      setProgram(null);
      setMilestones([]);
      setError('Program ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('program_id', id)
        .maybeSingle();

      if (programError) {
        console.error('[ProgramDetail] program query error:', programError);
        throw new Error('Failed to load program details');
      }

      if (!programData) {
        setProgram(null);
        setMilestones([]);
        setError('The selected program could not be found.');
        return;
      }

      setProgram(programData as Program);

      const { data: milestoneData, error: milestoneError } = await supabase
        .from('milestones')
        .select('*')
        .eq('program_id', id)
        .order('created_at', { ascending: true });

      if (milestoneError) {
        console.error('[ProgramDetail] milestone query error:', milestoneError);
        throw new Error('Failed to load milestones');
      }

      const fetchedMilestones = (milestoneData || []) as Milestone[];

      if (!user?.user_id || fetchedMilestones.length === 0) {
        setMilestones(fetchedMilestones.map((m) => ({ ...m, userAchievement: null })));
        return;
      }

      const milestoneIds = fetchedMilestones.map((m) => m.milestone_id);

      const { data: achievementData, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.user_id)
        .in('milestone_id', milestoneIds)
        .order('created_at', { ascending: false });

      if (achievementError) {
        console.error('[ProgramDetail] achievement query error:', achievementError);
        throw new Error('Failed to load achievement status');
      }

      const achievements = (achievementData || []) as Achievement[];
      const achievementMap = new Map<string, Achievement>();

      for (const achievement of achievements) {
        if (!achievementMap.has(achievement.milestone_id)) {
          achievementMap.set(achievement.milestone_id, achievement);
        }
      }

      const enrichedMilestones: MilestoneWithAchievement[] = fetchedMilestones.map(
        (milestone) => ({
          ...milestone,
          userAchievement: achievementMap.get(milestone.milestone_id) ?? null,
        })
      );

      setMilestones(enrichedMilestones);
    } catch (err) {
      console.error('[ProgramDetail] load error:', err);
      setProgram(null);
      setMilestones([]);
      setError(err instanceof Error ? err.message : 'Failed to load program details');
    } finally {
      setLoading(false);
    }
  }, [id, user?.user_id]);

  useEffect(() => {
    void loadProgramDetail();
  }, [loadProgramDetail]);

  const handleOpenSubmission = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setIsSubmissionModalOpen(true);
  };

  const handleCloseSubmission = () => {
    setIsSubmissionModalOpen(false);
    setSelectedMilestone(null);
  };

  const handleSubmitted = async () => {
    await loadProgramDetail();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card className="animate-pulse h-40" />
        <Card className="animate-pulse h-64" />
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="text-center py-12">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Program Not Available
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'The selected program could not be found.'}
          </p>
          <Link to="/programs">
            <Button>Back to Programs</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="text-sm text-gray-500">
          <Link to="/dashboard" className="hover:text-primary-600">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <Link to="/programs" className="hover:text-primary-600">
            Programs
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700 font-medium">{program.name}</span>
        </div>

        <Card>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Link
                to="/programs"
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Programs
              </Link>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {program.name}
                </h1>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusClasses(
                    program.status
                  )}`}
                >
                  {(program.status || 'active').toUpperCase()}
                </span>
              </div>

              <p className="text-gray-600 max-w-3xl">
                {program.description || 'No program description available.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px]">
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  Timeline
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatDate(program.start_date)} — {formatDate(program.end_date)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Users className="w-4 h-4" />
                  Participants
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {program.participant_count ?? 0}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Coins className="w-4 h-4" />
                  Token Allocation
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {(program.token_allocation ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Target className="w-4 h-4" />
                  Milestones
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {milestoneCount}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Milestones</h2>
            <span className="text-sm text-gray-500">{milestoneCount} total</span>
          </div>

          {milestones.length === 0 ? (
            <Card className="text-center py-10">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Milestones Available
              </h3>
              <p className="text-gray-600">
                This program does not yet have milestones assigned.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {milestones.map((milestone) => {
                const verificationStatus =
                  milestone.userAchievement?.verification_status ?? null;
                const workflowStatus = milestone.userAchievement?.status ?? null;

                const isVerified = verificationStatus === 'verified';
                const isRejected = verificationStatus === 'rejected';
                const isPending =
                  verificationStatus === 'pending' ||
                  workflowStatus === 'submitted' ||
                  workflowStatus === 'pending';

                const showSubmitButton =
                  !milestone.userAchievement ||
                  (!isVerified && !isPending && !isRejected);

                const showRejectedResubmit = isRejected;

                return (
                  <Card
                    key={milestone.milestone_id}
                    hover
                    className={`h-full ${
                      isVerified ? 'border-2 border-green-200' : ''
                    } ${isRejected ? 'border-2 border-red-200' : ''}`}
                  >
                    <div className="space-y-4 h-full flex flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {milestone.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {milestone.description ||
                              'No milestone description available.'}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {milestone.difficulty && (
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded ${difficultyClasses(
                                milestone.difficulty
                              )}`}
                            >
                              {milestone.difficulty}
                            </span>
                          )}

                          {!milestone.userAchievement && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                              Available
                            </span>
                          )}

                          {isPending && !isVerified && !isRejected && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700 inline-flex items-center gap-1">
                              <FileCheck className="w-3 h-3" />
                              Submitted
                            </span>
                          )}

                          {isVerified && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700 inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          )}

                          {isRejected && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                          <div className="text-gray-500 mb-1">Reward</div>
                          <div className="font-medium text-gray-900">
                            {milestone.reward_amount ?? 0}{' '}
                            {milestone.reward_token || 'IMPACT'}
                          </div>
                        </div>

                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                          <div className="text-gray-500 mb-1">Deadline</div>
                          <div className="font-medium text-gray-900">
                            {formatDate(milestone.deadline)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                          <div className="text-gray-500 mb-1">Category</div>
                          <div className="font-medium text-gray-900">
                            {milestone.category || 'General'}
                          </div>
                        </div>

                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                          <div className="text-gray-500 mb-1">Verification</div>
                          <div className="font-medium text-gray-900">
                            {milestone.verification_type || 'manual'}
                          </div>
                        </div>
                      </div>

                      {milestone.userAchievement?.evidence_url && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                          <div className="text-blue-800 font-medium mb-1">
                            Submitted Evidence
                          </div>
                          <a
                            href={milestone.userAchievement.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 underline break-all"
                          >
                            {milestone.userAchievement.evidence_url}
                          </a>
                        </div>
                      )}

                      <div className="mt-auto pt-2">
                        {showSubmitButton && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleOpenSubmission(milestone)}
                            disabled={!user}
                          >
                            View / Submit Milestone
                          </Button>
                        )}

                        {isPending && !isVerified && !isRejected && (
                          <div className="flex items-center justify-center gap-2 text-blue-700 py-2">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">Pending Verification</span>
                          </div>
                        )}

                        {isVerified && (
                          <div className="flex items-center justify-center gap-2 text-green-700 py-2">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Achievement Verified</span>
                          </div>
                        )}

                        {showRejectedResubmit && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-red-700 py-2">
                              <AlertCircle className="w-5 h-5" />
                              <span className="font-medium">Submission Rejected</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleOpenSubmission(milestone)}
                              disabled={!user}
                            >
                              Resubmit Achievement
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={handleCloseSubmission}
        milestone={selectedMilestone}
        userId={user?.user_id || ''}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}