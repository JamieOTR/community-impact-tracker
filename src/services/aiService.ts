// PATH: src/services/aiService.ts
import { databaseService } from './database';
import { elevenLabsService } from './elevenLabsService';

export interface AIResponse {
  message: string;
  suggestions?: string[];
  actions?: Array<{
    type: 'milestone' | 'progress' | 'wallet' | 'community';
    data?: unknown;
  }>;
  audioUrl?: string;
}

function safeUUID(): string {
  const g = globalThis as unknown as {
    crypto?: {
      randomUUID?: () => string;
      getRandomValues?: (arr: Uint8Array) => void;
    };
  };

  if (typeof g?.crypto?.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }

  if (typeof g?.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    g.crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type UserContext = {
  user: unknown;
  achievements: unknown[] | null;
  milestones: unknown[] | null;
  rewards: Array<{ status: string; token_amount?: number }> | null;
  totalTokens: number;
} | null;

export class AIService {
  private sessionId: string;
  private selectedVoiceId?: string;

  constructor() {
    this.sessionId = safeUUID();
  }

  setVoiceId(voiceId: string) {
    this.selectedVoiceId = voiceId;
  }

  async processMessage(userId: string, message: string, _context?: unknown): Promise<AIResponse> {
    try {
      if (!userId) {
        return {
          message: "You're not signed in yet. Please sign in to use AI assistance.",
          suggestions: ['Sign in', 'Create an account'],
        };
      }

      const userContext = await this.getUserContext(userId);
      const response = await this.generateResponse(message, userContext);

      if (elevenLabsService.isAvailable() && this.selectedVoiceId) {
        try {
          const audioBlob = await elevenLabsService.generateAIResponse(
            response.message,
            this.selectedVoiceId
          );
          response.audioUrl = URL.createObjectURL(audioBlob);
        } catch (err: unknown) {
          console.error('Failed to generate voice response:', err);
        }
      }

      await this.logInteraction(userId, message, response.message);
      return response;
    } catch (err: unknown) {
      console.error('AI Service error:', err);
      return {
        message: "I'm sorry, I'm having trouble processing your request right now.",
        suggestions: ['Try asking about milestones', 'Check your progress', 'Connect your wallet'],
      };
    }
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    try {
      const user = await databaseService.getCurrentUser();
      if (!user) return null;

      const [achievements, milestones, rewards] = await Promise.all([
        databaseService.getUserAchievements(userId),
        databaseService.getMilestones(userId),
        databaseService.getUserRewards(userId),
      ]);

      const typedRewards = (rewards ?? []) as Array<{ status: string; token_amount?: number }>;

      const totalTokens = typedRewards
        .filter((r) => r.status === 'confirmed')
        .reduce((sum, r) => sum + (r.token_amount ?? 0), 0);

      return {
        user,
        achievements: (achievements ?? []) as unknown[],
        milestones: (milestones ?? []) as unknown[],
        rewards: typedRewards,
        totalTokens,
      };
    } catch (err: unknown) {
      console.error('Failed to get user context:', err);
      return null;
    }
  }

  private async generateResponse(message: string, _userContext: UserContext): Promise<AIResponse> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('progress')) {
      return { message: 'Here is your current progress.' };
    }

    return { message: "I'm here to help with your community impact journey." };
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
    } catch (err: unknown) {
      console.error('Failed to log interaction:', err);
    }
  }
}

export const aiService = new AIService();