import Anthropic from '@anthropic-ai/sdk';
import { db } from '@watchagent/database';
import { conversations, userPreferences } from '@watchagent/database';
import { eq, and, desc } from 'drizzle-orm';
import { CLAUDE_MODEL, ConversationInsights, ConversationSummary, OnboardingSummary, RecentConversationSummary } from '@watchagent/shared';
import { logError, logInfo } from '../../config/logger';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export class ConversationSummaryService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Summarize the onboarding conversation for a user
   */
  async summarizeOnboardingConversation(userId: string): Promise<OnboardingSummary | null> {
    try {
      // Get the onboarding conversation
      const onboardingConv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.userId, userId),
          eq(conversations.isOnboarding, true),
          eq(conversations.onboardingCompleted, true)
        ),
        orderBy: [desc(conversations.createdAt)],
      });

      if (!onboardingConv) {
        logInfo('No completed onboarding conversation found', { userId });
        return null;
      }

      const messages = onboardingConv.messages as ChatMessage[];
      if (messages.length === 0) {
        return null;
      }

      // Extract insights from conversation
      const insights = await this.extractConversationInsights(messages);

      return {
        summary: insights.summary,
        keyPoints: insights.keyPoints,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      logError(error as Error, { userId, service: 'ConversationSummaryService.summarizeOnboardingConversation' });
      return null;
    }
  }

  /**
   * Summarize recent conversations (non-onboarding)
   */
  async summarizeRecentConversations(userId: string, limit: number = 5): Promise<RecentConversationSummary[]> {
    try {
      // Get recent non-onboarding conversations
      const recentConvs = await db.query.conversations.findMany({
        where: and(
          eq(conversations.userId, userId),
          eq(conversations.isOnboarding, false)
        ),
        orderBy: [desc(conversations.updatedAt)],
        limit,
      });

      const summaries: RecentConversationSummary[] = [];

      for (const conv of recentConvs) {
        const messages = conv.messages as ChatMessage[];

        // Skip if no meaningful conversation (< 2 user messages)
        const userMessages = messages.filter(m => m.role === 'user');
        if (userMessages.length < 2) {
          continue;
        }

        // Extract insights
        const insights = await this.extractConversationInsights(messages);

        summaries.push({
          conversationId: conv.id,
          summary: insights.summary,
          timestamp: conv.updatedAt.toISOString(),
          context: conv.context as Record<string, any>,
        });
      }

      return summaries;
    } catch (error) {
      logError(error as Error, { userId, service: 'ConversationSummaryService.summarizeRecentConversations' });
      return [];
    }
  }

  /**
   * Extract insights from conversation messages using Claude
   */
  async extractConversationInsights(messages: ChatMessage[]): Promise<ConversationInsights> {
    try {
      // Build conversation text
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const extractionPrompt = `Analyze this conversation between a user and a movie/TV recommendation assistant. Extract the user's preferences and taste.

CONVERSATION:
${conversationText}

Extract and return ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence summary of the user's movie/TV taste and preferences",
  "keyPoints": ["specific preference 1", "specific preference 2", "..."],
  "moodPreferences": ["moods they like: uplifting, scary, thought-provoking, funny, dark, emotional, etc."],
  "dislikes": ["genres/content/themes they explicitly dislike or want to avoid"],
  "favoriteMovies": ["specific titles they mentioned loving"],
  "favoriteGenres": ["genres they mentioned liking"],
  "favoriteActors": ["actors, directors, or creators they mentioned"]
}

Important:
- Only include items explicitly mentioned by the user
- If a category has no items, use an empty array
- Keep keyPoints specific and actionable
- Mood preferences should be adjectives (uplifting, dark, funny, etc.)
- Return ONLY the JSON, no other text`;

      const response = await this.anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: extractionPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response (handle potential markdown formatting)
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const insights = JSON.parse(jsonMatch[0]) as ConversationInsights;
          return insights;
        }
      }

      // Return default if parsing fails
      return {
        summary: 'User preferences not clearly defined',
        keyPoints: [],
        moodPreferences: [],
        dislikes: [],
      };
    } catch (error) {
      logError(error as Error, { service: 'ConversationSummaryService.extractConversationInsights' });
      return {
        summary: 'Error extracting preferences',
        keyPoints: [],
        moodPreferences: [],
        dislikes: [],
      };
    }
  }

  /**
   * Update user's conversation summary in database
   */
  async updateUserConversationSummary(userId: string): Promise<void> {
    try {
      logInfo('Updating conversation summary', { userId });

      // Get existing summary
      const existingPrefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      if (!existingPrefs) {
        logInfo('No user preferences found, skipping summary update', { userId });
        return;
      }

      const existingSummary = (existingPrefs.conversationSummary as any) || {};

      // Get onboarding summary if not already stored
      let onboardingSummary = existingSummary.onboardingConversation;
      if (!onboardingSummary) {
        onboardingSummary = await this.summarizeOnboardingConversation(userId);
        logInfo('Generated onboarding summary', { userId, hasSummary: !!onboardingSummary });
      }

      // Get recent conversation summaries
      const recentSummaries = await this.summarizeRecentConversations(userId, 5);
      logInfo('Generated recent conversation summaries', { userId, count: recentSummaries.length });

      // Build new conversation summary
      const newSummary: ConversationSummary = {
        onboardingConversation: onboardingSummary || undefined,
        recentConversations: recentSummaries,
        lastUpdated: new Date().toISOString(),
      };

      // Update database
      await db
        .update(userPreferences)
        .set({
          conversationSummary: newSummary as any,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId));

      logInfo('Conversation summary updated successfully', { userId });
    } catch (error) {
      logError(error as Error, { userId, service: 'ConversationSummaryService.updateUserConversationSummary' });
      throw error;
    }
  }
}
