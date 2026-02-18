// src/services/aiService.ts
import { databaseService } from './database';
import { elevenLabsService } from './elevenLabsService';

export interface AIResponse {
  message: string;
  suggestions?: string[];
  actions?: Array<{
    type: 'milestone' | 'progress' | 'wallet' | 'community';
    data?: any;
  }>;
  audioUrl?: string;
}

/**
 * Safe UUID generator.
 * - Uses crypto.randomUUID() when available
 * - Falls back to crypto.getRandomValues()-based RFC4122 v4 UUID
 * - Final fallback: Math.random (last resort; still prevents app crash)
 */
function safeUUID(): string {
  const g: any = globalThis as any;

  if (g?.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }

  if (g?.crypto && typeof g.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    g.crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class AIService {
  private sessionId: string;
  private selectedVoiceId?: string;

  constructor() {
    this.sessionId = safeUUID();
  }

  setVoiceId(voiceId: string) {
    this.selectedVoiceId = voiceId;
  }

  async processMessage(userId: string, message: string, context?: any): Promise<AIResponse> {
    try {
      if (!userId) {
        return {
          message: "You're not signed in yet. Please sign in to use AI assistance.",
          suggestions: ['Sign in', 'Create an account'],
        };
      }

      const userContext = await this.getUserContext(userId);
      const response = await this.generateResponse(message, userContext, context);

      if (elevenLabsService.isAvailable() && this.selectedVoiceId) {
        try {
          const audioBlob = await elevenLabsService.generateAIResponse(response.message, this.selectedVoiceId);
          response.audioUrl = URL.createObjectURL(audioBlob);
        } catch (error) {
          console.error('Failed to generate voice response:', error);
        }
      }

      await this.logInteraction(userId, message, response.message);
      return response;
    } catch (error) {
      console.error('AI Service error:', error);
      return {
        message: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        suggestions: ['Try asking about available milestones', 'Check your progress', 'Connect your wallet'],
      };
    }
  }

  private async getUserContext(userId: string) {
    try {
      const user = await databaseService.getCurrentUser();
      if (!user) return null;

      const [achievements, milestones, rewards] = await Promise.all([
        databaseService.getUserAchievements(userId),
        databaseService.getMilestones(userId),
        databaseService.getUserRewards(userId),
      ]);

      return {
        user,
        achievements,
        milestones,
        rewards,
        totalTokens: (rewards || [])
          .filter((r: any) => r.status === 'confirmed')
          .reduce((sum: number, r: any) => sum + (r.token_amount || 0), 0),
      };
    } catch (error) {
      console.error('Failed to get user context:', error);
      return null;
    }
  }

  private async generateResponse(message: string, userContext: any, context?: any): Promise<AIResponse> {
    const lowerMessage = message.toLowerCase();

    if (this.isVoiceMilestoneSubmission(lowerMessage)) {
      return this.handleVoiceMilestoneSubmission(message, userContext);
    }

    if (lowerMessage.includes('milestone') || lowerMessage.includes('goal') || lowerMessage.includes('task')) {
      return this.handleMilestoneQuery(userContext);
    }

    if (lowerMessage.includes('progress') || lowerMessage.includes('status') || lowerMessage.includes('achievement')) {
      return this.handleProgressQuery(userContext);
    }

    if (lowerMessage.includes('wallet') || lowerMessage.includes('connect') || lowerMessage.includes('token')) {
      return this.handleWalletQuery(userContext);
    }

    if (lowerMessage.includes('community') || lowerMessage.includes('member') || lowerMessage.includes('join')) {
      return this.handleCommunityQuery(userContext);
    }

    if (lowerMessage.includes('reward') || lowerMessage.includes('earn') || lowerMessage.includes('impact')) {
      return this.handleRewardQuery(userContext);
    }

    if (lowerMessage.includes('voice') || lowerMessage.includes('speak') || lowerMessage.includes('audio')) {
      return this.handleVoiceQuery(userContext);
    }

    if (lowerMessage.includes('video') || lowerMessage.includes('avatar') || lowerMessage.includes('generate')) {
      return this.handleVideoQuery(userContext);
    }

    return this.getDefaultResponse(userContext);
  }

  private isVoiceMilestoneSubmission(message: string): boolean {
    const voiceIndicators = [
      'i completed',
      'i finished',
      'i did',
      'just completed',
      'just finished',
      'submit milestone',
      'milestone complete',
      'done with',
      'finished the',
    ];
    return voiceIndicators.some((indicator) => message.includes(indicator));
  }

  private async handleVoiceMilestoneSubmission(message: string, userContext: any): Promise<AIResponse> {
    const timestamp = new Date().toLocaleString();

    if (userContext?.user) {
      try {
        await databaseService.logInteraction({
          user_id: userContext.user.user_id,
          message: `VOICE SUBMISSION: ${message}`,
          ai_response: `Voice milestone submission logged at ${timestamp}`,
          context_type: 'voice_milestone_submission',
          session_id: this.sessionId,
        });
      } catch (error) {
        console.error('Failed to log voice submission:', error);
      }
    }

    return {
      message: `I heard you say: "${message}". I've logged your milestone submission at ${timestamp}. Please provide any evidence or additional details, and I'll help you submit it for verification. Would you like me to guide you through the submission process?`,
      suggestions: ['Yes, help me submit evidence', 'Show me submission requirements', 'Check my progress'],
      actions: [{ type: 'milestone', data: { action: 'voice_submission', message, timestamp } }],
    };
  }

  private handleMilestoneQuery(userContext: any): AIResponse {
    const completedCount = userContext?.achievements?.length || 0;
    const availableMilestones =
      userContext?.milestones?.filter(
        (m: any) => !userContext.achievements?.some((a: any) => a.milestone_id === m.milestone_id)
      ) || [];

    return {
      message: `I found ${availableMilestones.length} available milestones for you! You've already completed ${completedCount} milestones. Here are some recommendations based on your interests and location.`,
      suggestions: ['Show environmental milestones', 'Find education opportunities', 'View community service options', 'See quick wins (easy milestones)'],
      actions: [{ type: 'milestone', data: { action: 'browse_available', available: availableMilestones.length } }],
    };
  }

  private handleProgressQuery(userContext: any): AIResponse {
    const totalScore = userContext?.user?.total_impact_score || 0;
    const tokenBalance = userContext?.totalTokens || 0;
    const completedMilestones = userContext?.achievements?.filter((a: any) => a.status === 'completed').length || 0;

    return {
      message: `You're doing amazing! Here's your current progress: ${totalScore.toLocaleString()} impact points, ${tokenBalance} IMPACT tokens earned, and ${completedMilestones} milestones completed. You're making a real difference in your community!`,
      suggestions: ['View detailed progress', 'See leaderboard position', 'Find next milestone', 'Check pending rewards'],
      actions: [{ type: 'progress', data: { score: totalScore, tokens: tokenBalance, milestones: completedMilestones } }],
    };
  }

  private handleWalletQuery(userContext: any): AIResponse {
    const hasWallet = userContext?.user?.wallet_address;

    if (hasWallet) {
      return {
        message: `Your wallet is connected! Address: ${userContext.user.wallet_address.slice(0, 6)}...${userContext.user.wallet_address.slice(-4)}. Your current balance is ${userContext.totalTokens || 0} IMPACT tokens.`,
        suggestions: ['View transaction history', 'Check pending rewards', 'Disconnect wallet', 'View wallet on blockchain'],
      };
    }

    return {
      message: "To receive your IMPACT token rewards automatically, you'll need to connect your wallet. Click the wallet icon in the header and follow the prompts to connect MetaMask or another Web3 wallet.",
      suggestions: ['Connect MetaMask', 'Learn about Web3 wallets', 'View rewards without wallet', 'Get help with setup'],
      actions: [{ type: 'wallet', data: { action: 'connect' } }],
    };
  }

  private handleCommunityQuery(userContext: any): AIResponse {
    const user = userContext?.user;

    if (user?.community_id) {
      return {
        message: "You're part of a community! This is a great place to collaborate on impactful projects and earn rewards together. Your community has been working on amazing initiatives.",
        suggestions: ['View community programs', 'See member leaderboard', 'Find collaboration opportunities', 'Check community impact'],
      };
    }

    return {
      message: "It looks like you're not part of a community yet. Joining a community gives you access to exclusive programs, collaborative projects, and local impact opportunities!",
      suggestions: ['Browse communities', 'Create new community', 'Learn about benefits', 'Get invitation code'],
    };
  }

  private handleRewardQuery(userContext: any): AIResponse {
    const tokenBalance = userContext?.totalTokens || 0;

    return {
      message: `You've earned ${tokenBalance} IMPACT tokens so far! These tokens are automatically sent to your connected wallet when milestones are verified. Your recent achievements have been making a real impact.`,
      suggestions: ['View earning history', 'Check pending rewards', 'Learn about token value', 'Find high-reward milestones'],
      actions: [{ type: 'milestone', data: { action: 'high_reward_milestones', current_balance: tokenBalance } }],
    };
  }

  private handleVoiceQuery(_userContext: any): AIResponse {
    const isAvailable = elevenLabsService.isAvailable();

    if (isAvailable) {
      return {
        message: "Voice features are enabled! I can speak my responses and you can use voice input to submit milestones. You can also customize my voice in the settings. Try saying 'I completed the community clean-up milestone' to test voice submission!",
        suggestions: ['Test voice input', 'Change voice settings', 'Generate milestone announcement', 'Learn about voice features'],
      };
    }

    return {
      message: 'Voice features are currently unavailable because the ElevenLabs API key is not configured. Contact your administrator to enable voice capabilities.',
      suggestions: ['Learn about voice features', 'Use text input instead', 'Contact support', 'View documentation'],
    };
  }

  private handleVideoQuery(_userContext: any): AIResponse {
    const isAvailable = elevenLabsService.isAvailable();

    if (isAvailable) {
      return {
        message: 'Video generation features are available! I can create personalized celebration videos when you complete milestones, or generate custom community announcements with AI avatars. Would you like to try generating a video?',
        suggestions: ['Generate milestone video', 'Create custom message', 'View avatar options', 'Learn about video features'],
      };
    }

    return {
      message: 'Video generation features are currently unavailable because the Tavus API key is not configured. Contact your administrator to enable video capabilities.',
      suggestions: ['Learn about video features', 'View static celebrations', 'Contact support', 'Check back later'],
    };
  }

  private getDefaultResponse(userContext: any): AIResponse {
    const name = userContext?.user?.name?.split(' ')[0] || 'there';
    return {
      message: `Hi ${name}! I'm here to help with your community impact journey. You can ask me about finding milestones, checking your progress, connecting your wallet, or understanding how rewards work. What would you like to explore?`,
      suggestions: ['Find new milestones', 'Check my progress', 'Connect wallet', 'Try voice features'],
    };
  }

  private async logInteraction(userId: string, message: string, response: string): Promise<void> {
    try {
      await databaseService.logInteraction({
        user_id: userId,
        message,
        ai_response: response,
        session_id: this.sessionId,
        context_type: 'chat',
      });
    } catch (error) {
      console.error('Failed to log interaction:', error);
    }
  }

  async processVoiceInput(audioBlob: Blob, userId: string): Promise<AIResponse> {
    try {
      const transcription = await this.mockSpeechToText(audioBlob);
      const response = await this.processMessage(userId, transcription);
      return { ...response, message: `I heard: "${transcription}". ${response.message}` };
    } catch (error) {
      console.error('Voice processing error:', error);
      return { message: "I'm sorry, I couldn't process your voice input. Please try speaking again or type your message." };
    }
  }

  private async mockSpeechToText(_audioBlob: Blob): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const mockTranscriptions = [
      'I completed the community clean-up milestone',
      'I finished organizing the food bank volunteer event',
      'I just completed the digital literacy workshop',
      'I want to check my progress',
      'How many tokens have I earned?',
      'What milestones are available?',
    ];
    return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
  }

  async generateSpeechResponse(text: string): Promise<void> {
    try {
      if (elevenLabsService.isAvailable() && this.selectedVoiceId) {
        await elevenLabsService.playText(text, this.selectedVoiceId);
        return;
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  }
}

export const aiService = new AIService();
