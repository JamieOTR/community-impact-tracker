// PATH: src/components/Admin/CommunityReferralManager.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Users, QrCode, Mail, MessageSquare, TrendingUp } from 'lucide-react';

import Card from '../UI/Card';
import Button from '../UI/Button';
import { supabase } from '../../services/supabase';

interface CommunityReferralManagerProps {
  communityId: string;
  referralCode: string;
}

type RecentJoin = {
  name: string;
  created_at: string;
};

export default function CommunityReferralManager({
  communityId,
  referralCode,
}: CommunityReferralManagerProps) {
  const [memberCount, setMemberCount] = useState(0);
  const [recentJoins, setRecentJoins] = useState<RecentJoin[]>([]);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(
    () => `${window.location.origin}/join?code=${referralCode}`,
    [referralCode]
  );

  const fetchCommunityStats = useCallback(async () => {
    try {
      // Member count
      const { count, error: countError } = await supabase
        .from('users')
        .select('user_id', { count: 'exact', head: true })
        .eq('community_id', communityId);

      if (countError) throw countError;
      setMemberCount(count ?? 0);

      // Recent joins
      const { data: recentMembers, error: recentError } = await supabase
        .from('users')
        .select('name, created_at')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const normalized: RecentJoin[] = (recentMembers ?? [])
        .filter((m): m is RecentJoin => !!m && typeof m.name === 'string' && typeof m.created_at === 'string');

      setRecentJoins(normalized);
    } catch (err: unknown) {
      console.error('Failed to fetch community stats:', err);
    }
  }, [communityId]);

  useEffect(() => {
    void fetchCommunityStats();
  }, [fetchCommunityStats]);

  const flashCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      flashCopied();
    } catch (err: unknown) {
      console.error('Failed to copy referral code:', err);
    }
  };

  const shareReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashCopied();
    } catch (err: unknown) {
      console.error('Failed to copy referral link:', err);
    }
  };

  const generateQRCode = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
  };

  const shareViaEmail = () => {
    const subject = 'Join Our Community Impact Initiative';
    const body =
      `Hi there!\n\n` +
      `I'd like to invite you to join our community impact initiative. We're working together to make a positive difference in our community.\n\n` +
      `Join us here: ${shareUrl}\n\n` +
      `Use referral code: ${referralCode}\n\n` +
      `Looking forward to having you on board!`;

    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_self'
    );
  };

  const shareViaSMS = () => {
    const message = `Join our community impact initiative! Use code ${referralCode} or visit: ${shareUrl}`;
    window.open(`sms:?body=${encodeURIComponent(message)}`, '_self');
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Referral Code</h3>

        <div className="text-center mb-6">
          <div className="bg-primary-50 border-2 border-dashed border-primary-200 rounded-lg p-6 mb-4">
            <p className="text-sm text-gray-600 mb-2">Share this code with new members</p>
            <p className="text-3xl font-bold text-primary-600 font-mono tracking-wider">{referralCode}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={copyReferralCode} variant="outline" size="sm" className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>

            <Button onClick={shareReferralLink} size="sm" className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share Link
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={generateQRCode} variant="outline" size="sm" className="w-full">
            <QrCode className="w-4 h-4 mr-2" />
            QR Code
          </Button>

          <Button onClick={shareViaEmail} variant="outline" size="sm" className="w-full">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>

          <Button onClick={shareViaSMS} variant="outline" size="sm" className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS
          </Button>

          <Button
            onClick={() => {
              if (navigator.share) {
                void navigator.share({
                  title: 'Join Our Community',
                  text: `Use referral code: ${referralCode}`,
                  url: shareUrl,
                });
              } else {
                void shareReferralLink();
              }
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Share2 className="w-4 h-4 mr-2" />
            More
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Growth</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Total Members</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{memberCount}</p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Growth Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-700">+12%</p>
          </div>
        </div>

        {recentJoins.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Recent Members</h4>
            <div className="space-y-2">
              {recentJoins.map((member, index) => (
                <motion.div
                  key={`${member.created_at}-${member.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 text-sm font-semibold">
                        {member.name?.charAt(0) ?? '?'}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{member.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}