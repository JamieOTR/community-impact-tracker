// PATH: src/components/Achievement/SubmissionModal.tsx
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../UI/Button';
import { databaseService, type Milestone } from '../../services/database';

type SubmissionModalProps = {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  milestone: Milestone | null;
  userId: string;
  onSubmitted?: () => void;
};

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function SubmissionModal({
  isOpen,
  onClose,
  milestone,
  userId,
  onSubmitted,
}: SubmissionModalProps) {
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setEvidenceUrl('');
      setNotes('');
      setSubmitState('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen || !milestone) return null;

  const handleClose = () => {
    if (submitState === 'submitting') return;
    onClose(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setSubmitState('error');
      setErrorMessage('No authenticated user found.');
      return;
    }

    if (!evidenceUrl.trim()) {
      setSubmitState('error');
      setErrorMessage('Please provide an evidence URL.');
      return;
    }

    try {
      setSubmitState('submitting');
      setErrorMessage('');

      const existingAchievements = await databaseService.getUserAchievementsByMilestones(
        userId,
        [milestone.milestone_id]
      );

      const latestExisting = existingAchievements[0];
      const existingState =
        latestExisting?.verification_status || latestExisting?.status || null;

      if (latestExisting && existingState !== 'rejected') {
        setSubmitState('error');
        setErrorMessage('This milestone has already been submitted and is awaiting review.');
        return;
      }

      const achievement = await databaseService.createAchievement({
        user_id: userId,
        milestone_id: milestone.milestone_id,
        evidence_url: evidenceUrl.trim(),
        progress: 100,
        status: 'submitted',
      });

      if (!achievement) {
        throw new Error('Achievement submission failed.');
      }

      setSubmitState('success');

      if (onSubmitted) {
        await onSubmitted();
      }

      setTimeout(() => {
        onClose(true);
      }, 1200);
    } catch (err) {
      console.error('SubmissionModal submit error:', err);
      setSubmitState('error');
      setErrorMessage('Failed to submit milestone. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />

        <motion.div
          className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Submit Milestone</h2>
              <p className="text-sm text-gray-500 mt-1">{milestone.title}</p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              disabled={submitState === 'submitting'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence URL
              </label>

              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://example.com/proof-of-completion"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={submitState === 'submitting' || submitState === 'success'}
              />

              <p className="text-xs text-gray-500 mt-1">
                Provide a link demonstrating milestone completion, such as a document,
                image, portfolio item, public post, report, or other proof.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add context about your submission..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={submitState === 'submitting' || submitState === 'success'}
              />

              <p className="text-xs text-gray-500 mt-1">
                Add a short explanation describing what was completed and how the evidence supports it.
              </p>
            </div>

            {submitState === 'error' && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {submitState === 'success' && (
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Milestone submitted successfully.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitState === 'submitting'}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitState === 'submitting' || submitState === 'success'}
              >
                {submitState === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Achievement'
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}