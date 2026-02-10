import { db } from '@watchagent/database';
import { conversations, ratings, watchlistItems, content, userPreferences } from '@watchagent/database';
import { eq, and } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { sessionTracker } from '../../services/feedback/session-tracker.service';
import { batchPreferencesService } from '../../services/feedback/batch-preferences.service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface FeedbackData {
  userId: string;
  contentId: string;
  contentTitle: string;
  action: 'not_relevant' | 'keep' | 'watchlist' | 'watched';
  rating?: number;
}

interface FeedbackResult {
  success: boolean;
  preferencesUpdated: boolean; // Queued for batch update
  learnedInsightsUpdated: boolean;
  shouldRemoveFromUI: boolean;
}

class FeedbackService {
  constructor() {
    // Listen for session completion events
    sessionTracker.on('sessionComplete', async (data: { userId: string; actions: any[] }) => {
      console.log(`[FeedbackService] Processing batch update for user ${data.userId}`);
      await batchPreferencesService.updatePreferencesFromBatch(data.userId, data.actions);
    });
  }

  async processFeedback(data: FeedbackData): Promise<FeedbackResult> {
    console.log('\n========== FEEDBACK RECEIVED ==========');
    console.log('User ID:', data.userId);
    console.log('Content ID:', data.contentId);
    console.log('Content Title:', data.contentTitle);
    console.log('Action:', data.action);
    console.log('Rating:', data.rating || 'N/A');
    console.log('=======================================\n');

    try {
      // Get content details for context
      const [contentData] = await db.select().from(content).where(eq(content.id, data.contentId)).limit(1);

      // genres is already a JS object (JSONB field), no need to parse
      const genres = contentData?.genres && Array.isArray(contentData.genres)
        ? (contentData.genres as any[]).map((g: any) => g.name).join(', ')
        : '';
      const year = contentData?.releaseDate ? new Date(contentData.releaseDate).getFullYear().toString() : '';

      // Track action in session for batch processing
      sessionTracker.trackAction({
        userId: data.userId,
        contentId: data.contentId,
        contentTitle: data.contentTitle,
        action: data.action,
        rating: data.rating,
        timestamp: new Date(),
        genres,
        year,
      });

      // Handle rating if provided - save immediately
      if (data.rating && data.action === 'watched') {
        await this.saveRating(data.userId, data.contentId, data.rating);
      }

      // Handle watchlist action - save immediately
      if (data.action === 'watchlist') {
        await this.addToWatchlist(data.userId, data.contentId);
      }

      // Mark content as excluded from future recommendations if removed, watchlisted, or already watched
      const shouldExclude = data.action === 'not_relevant' || data.action === 'watchlist' || data.action === 'watched';

      if (shouldExclude) {
        await this.excludeFromRecommendations(data.userId, data.contentId);
      }

      // Update learned insights IMMEDIATELY for ANY rating
      let learnedInsightsUpdated = false;
      if (data.rating) {
        learnedInsightsUpdated = await this.updateLearnedInsights(data.userId, data, contentData);
      }

      return {
        success: true,
        preferencesUpdated: true, // Queued for batch update
        learnedInsightsUpdated,
        shouldRemoveFromUI: shouldExclude,
      };
    } catch (error) {
      console.error('[FeedbackService] Error processing feedback:', error);
      throw error;
    }
  }

  private async saveRating(userId: string, contentId: string, rating: number) {
    // Check if rating already exists
    const [existingRating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.contentId, contentId)))
      .limit(1);

    if (existingRating) {
      // Update existing rating
      await db.update(ratings).set({ rating: rating.toString(), updatedAt: new Date() }).where(eq(ratings.id, existingRating.id));
    } else {
      // Create new rating
      await db.insert(ratings).values({
        userId,
        contentId,
        rating: rating.toString(),
        isPublic: true,
      });
    }
  }

  private async addToWatchlist(userId: string, contentId: string) {
    // Check if already in watchlist
    const [existing] = await db
      .select()
      .from(watchlistItems)
      .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.contentId, contentId)))
      .limit(1);

    if (!existing) {
      await db.insert(watchlistItems).values({
        userId,
        contentId,
        status: 'to_watch',
      });
    }
  }

  private async excludeFromRecommendations(userId: string, contentId: string) {
    try {
      // Get or create user preferences
      const [userPref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

      if (userPref) {
        const currentExcluded = (userPref.learnedPreferences as any)?.excludedContent || [];
        const updatedExcluded = [...new Set([...currentExcluded, contentId])];

        await db
          .update(userPreferences)
          .set({
            learnedPreferences: {
              ...(userPref.learnedPreferences as any),
              excludedContent: updatedExcluded,
            },
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, userId));
      } else {
        // Create new user preferences with excluded content
        await db.insert(userPreferences).values({
          userId,
          learnedPreferences: {
            excludedContent: [contentId],
          },
        });
      }
    } catch (error) {
      console.error('[FeedbackService] Error excluding content:', error);
    }
  }

  private async updateLearnedInsights(
    userId: string,
    feedback: FeedbackData,
    contentData: any
  ): Promise<boolean> {
    try {
      // Get user's conversation
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.userId, userId), eq(conversations.isOnboarding, false)))
        .orderBy(conversations.createdAt)
        .limit(1);

      if (!conversation) {
        return false;
      }

      const currentContext = conversation.context as any;
      const currentInsights = currentContext?.learnedInsights || '';

      const feedbackDescription = this.getFeedbackDescription(feedback, contentData);

      const prompt = `You are WatchAgent. Update your learned insights about the user based on their rating.

Current Learned Insights:
${currentInsights || 'No insights recorded yet.'}

New Rating:
${feedbackDescription}

Update "What WatchAgent Learned From Your Conversations" to reflect this new rating.

Rules:
1. Focus on patterns and preferences revealed by this rating
2. Note what appeals or doesn't appeal to the user
3. Keep it conversational and insightful
4. Keep it under 100 words
5. Write in first person from WatchAgent's perspective ("I learned that you...", "I noticed you...")
6. Integrate with existing insights, don't just append

Return ONLY the updated learned insights text, nothing else.`;

      console.log('\n========== LEARNED INSIGHTS UPDATE - PROMPT TO SONNET ==========');
      console.log('Model: claude-sonnet-4-20250514');
      console.log('Max Tokens: 400');
      console.log('Temperature: 0.7');
      console.log('\nPROMPT:');
      console.log(prompt);
      console.log('================================================================\n');

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const updatedInsights = message.content[0].type === 'text' ? message.content[0].text : '';

      console.log('\n========== LEARNED INSIGHTS UPDATE - RESPONSE FROM SONNET ==========');
      console.log('Stop Reason:', message.stop_reason);
      console.log('Usage:', JSON.stringify(message.usage, null, 2));
      console.log('\nRESPONSE:');
      console.log(updatedInsights);
      console.log('====================================================================\n');

      // Update conversation context with learned insights
      const updatedContext = {
        ...currentContext,
        learnedInsights: updatedInsights,
      };

      await db
        .update(conversations)
        .set({
          context: updatedContext,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));

      return true;
    } catch (error) {
      console.error('[FeedbackService] Error updating learned insights:', error);
      return false;
    }
  }

  private getFeedbackDescription(feedback: FeedbackData, contentData: any): string {
    const title = feedback.contentTitle;
    // genres is already a JS object (JSONB field), no need to parse
    const genres = contentData?.genres && Array.isArray(contentData.genres)
      ? (contentData.genres as any[]).map((g: any) => g.name).join(', ')
      : 'Unknown';
    const year = contentData?.releaseDate ? new Date(contentData.releaseDate).getFullYear() : 'Unknown';

    let description = `Content: "${title}" (${year})\nGenres: ${genres}\n`;

    if (feedback.rating) {
      description += `Action: Watched and rated\nRating: ${feedback.rating}/5 stars`;
      if (feedback.rating === 1) {
        description += ` (Strongly disliked)`;
      } else if (feedback.rating === 2) {
        description += ` (Didn't enjoy much)`;
      } else if (feedback.rating === 3) {
        description += ` (It was okay)`;
      } else if (feedback.rating === 4) {
        description += ` (Really enjoyed it)`;
      } else if (feedback.rating === 5) {
        description += ` (LOVED IT!)`;
      }
    }

    return description;
  }
}

export const feedbackService = new FeedbackService();
