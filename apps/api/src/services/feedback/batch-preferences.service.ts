import Anthropic from '@anthropic-ai/sdk';
import { db } from '@watchagent/database';
import { userPreferences } from '@watchagent/database';
import { eq } from 'drizzle-orm';
import type { FeedbackAction } from './session-tracker.service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

class BatchPreferencesService {
  async updatePreferencesFromBatch(userId: string, actions: FeedbackAction[]): Promise<boolean> {
    try {
      console.log(`[BatchPreferences] Updating preferences for user ${userId} with ${actions.length} actions`);

      // Get current viewing preferences
      const [userPref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

      if (!userPref) {
        console.log('[BatchPreferences] No user preferences found, will create new');
      }

      const currentPreferences = userPref?.viewingPreferencesText || '';

      // Build summary of actions
      const actionsSummary = this.buildActionsSummary(actions);

      const prompt = `You are helping to maintain a user's viewing preferences profile based on their recent activity.

Current Viewing Preferences:
${currentPreferences || 'No preferences recorded yet.'}

Recent Session Activity:
${actionsSummary}

Please update the "Your Viewing Preferences" section to reflect this new information. Consider:
1. What types of content they're rejecting (marked not relevant)
2. What they're interested in watching (added to watchlist)
3. Content they marked as interesting (kept in recommendations)
4. Any ratings they provided and what that suggests about their tastes

Important:
- Integrate this information naturally into existing preferences
- Identify patterns and trends
- Keep it concise and clear (under 150 words)
- Write in first person from the user's perspective ("I enjoy...", "I'm not interested in...")

Return ONLY the updated viewing preferences text, nothing else.`;

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-20250514',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const updatedPreferences = message.content[0].type === 'text' ? message.content[0].text : '';

      // Update or create user preferences
      if (userPref) {
        await db
          .update(userPreferences)
          .set({
            viewingPreferencesText: updatedPreferences,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, userId));
      } else {
        await db.insert(userPreferences).values({
          userId,
          viewingPreferencesText: updatedPreferences,
        });
      }

      console.log('[BatchPreferences] Viewing preferences updated successfully');
      return true;
    } catch (error) {
      console.error('[BatchPreferences] Error updating preferences:', error);
      return false;
    }
  }

  private buildActionsSummary(actions: FeedbackAction[]): string {
    const lines: string[] = [];

    actions.forEach((action, index) => {
      const num = index + 1;
      const title = action.contentTitle;
      const genres = action.genres || 'Unknown genres';
      const year = action.year || 'Unknown year';

      switch (action.action) {
        case 'not_relevant':
          lines.push(`${num}. ❌ Marked "${title}" (${genres}, ${year}) as NOT RELEVANT`);
          break;
        case 'keep':
          lines.push(`${num}. 👍 Kept "${title}" (${genres}, ${year}) in recommendations - "This looks interesting"`);
          break;
        case 'watchlist':
          lines.push(`${num}. 📝 Added "${title}" (${genres}, ${year}) to watchlist`);
          break;
        case 'watched':
          if (action.rating) {
            let sentiment = '';
            if (action.rating === 1) sentiment = 'HATED IT';
            else if (action.rating === 2) sentiment = "Didn't enjoy much";
            else if (action.rating === 3) sentiment = 'It was okay';
            else if (action.rating === 4) sentiment = 'Really enjoyed it';
            else if (action.rating === 5) sentiment = 'LOVED IT';

            lines.push(
              `${num}. ⭐ Watched "${title}" (${genres}, ${year}) and ${sentiment} (${action.rating}/5 stars)`
            );
          } else {
            lines.push(`${num}. 👀 Watched "${title}" (${genres}, ${year})`);
          }
          break;
      }
    });

    return lines.join('\n');
  }
}

export const batchPreferencesService = new BatchPreferencesService();
