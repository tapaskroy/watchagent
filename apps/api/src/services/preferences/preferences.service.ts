import { db } from '@watchagent/database';
import { userPreferences, users, ratings, watchlistItems, conversations } from '@watchagent/database';
import { eq, desc, gte } from 'drizzle-orm';
import {
  UserPreferences,
  UpdatePreferencesRequest,
  UserProfile,
  LikedContent,
  ApiErrorCode,
  HttpStatus,
} from '@watchagent/shared';
import { AppError } from '../../middleware/error-handler';

export class PreferencesService {
  /**
   * Helper function to deduplicate learned preferences
   */
  private deduplicateLearnedPreferences(learned: any): any {
    if (!learned || typeof learned !== 'object') {
      return {};
    }

    const dedupe = (arr: any) => {
      if (!Array.isArray(arr)) return [];
      return Array.from(new Set(arr));
    };

    return {
      favoriteMovies: dedupe(learned.favoriteMovies),
      favoriteGenres: dedupe(learned.favoriteGenres),
      favoriteActors: dedupe(learned.favoriteActors),
      dislikes: dedupe(learned.dislikes),
      moodPreferences: dedupe(learned.moodPreferences),
    };
  }

  /**
   * Sync conversation context to user preferences
   * This should be called after onboarding completes or when preferences are updated
   */
  async syncConversationPreferences(userId: string): Promise<void> {
    // Get or create preferences
    let preferences = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (!preferences) {
      // Create default preferences
      const [newPrefs] = await db
        .insert(userPreferences)
        .values({
          userId,
          preferredGenres: [],
          favoriteActors: [],
          preferredLanguages: ['en'],
          contentTypes: ['movie', 'tv'],
          notificationSettings: {},
          learnedPreferences: {},
        })
        .returning();
      preferences = newPrefs;
    }

    // Get latest conversation context
    const latestConversation = await db.query.conversations.findFirst({
      where: eq(conversations.userId, userId),
      orderBy: [desc(conversations.updatedAt)],
    });

    if (latestConversation && latestConversation.context) {
      const conversationContext = latestConversation.context as any;
      const deduplicatedContext = this.deduplicateLearnedPreferences(conversationContext);

      // Sync conversation context to learned preferences if not already synced
      if (JSON.stringify(deduplicatedContext) !== JSON.stringify(preferences.learnedPreferences)) {
        await db
          .update(userPreferences)
          .set({
            learnedPreferences: deduplicatedContext,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, userId));
      }
    }
  }

  /**
   * Get user profile with preferences and stats
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    // Get user info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError(ApiErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }

    // Sync conversation preferences to learned preferences
    await this.syncConversationPreferences(userId);

    // Get preferences (now guaranteed to exist and be synced)
    const preferences = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (!preferences) {
      throw new AppError(ApiErrorCode.NOT_FOUND, 'Preferences not found', HttpStatus.NOT_FOUND);
    }

    // Ensure learned preferences are deduplicated in response
    const deduplicatedPreferences = {
      ...preferences,
      learnedPreferences: this.deduplicateLearnedPreferences(preferences.learnedPreferences),
    } as any;

    // Get stats
    const userRatings = await db.query.ratings.findMany({
      where: eq(ratings.userId, userId),
    });

    const userWatchlist = await db.query.watchlistItems.findMany({
      where: eq(watchlistItems.userId, userId),
    });

    const totalRatings = userRatings.length;
    const averageRating =
      totalRatings > 0
        ? userRatings.reduce((sum, r) => sum + Number(r.rating), 0) / totalRatings
        : 0;

    // Get liked content (ratings >= 7)
    const likedRatings = await db.query.ratings.findMany({
      where: gte(ratings.rating, '7'),
      with: {
        content: true,
      },
      orderBy: [desc(ratings.rating), desc(ratings.createdAt)],
      limit: 20,
    });

    const likedContent: LikedContent[] = likedRatings.map((rating: any) => ({
      id: rating.content.id,
      tmdbId: rating.content.tmdbId,
      type: rating.content.type,
      title: rating.content.title,
      posterPath: rating.content.posterPath,
      releaseDate: rating.content.releaseDate,
      rating: Number(rating.content.tmdbRating) || 0,
      userRating: Number(rating.rating),
      ratedAt: rating.createdAt,
    }));

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || undefined,
        bio: user.bio || undefined,
        avatarUrl: user.avatarUrl || undefined,
      },
      preferences: deduplicatedPreferences as UserPreferences,
      stats: {
        totalRatings,
        totalWatchlistItems: userWatchlist.length,
        averageRating: Math.round(averageRating * 10) / 10,
      },
      likedContent,
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    data: UpdatePreferencesRequest
  ): Promise<UserPreferences> {
    // Get or create preferences
    let preferences = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (!preferences) {
      // Create with provided data
      const [newPrefs] = await db
        .insert(userPreferences)
        .values({
          userId,
          preferredGenres: data.preferredGenres || [],
          favoriteActors: data.favoriteActors || [],
          preferredLanguages: data.preferredLanguages || ['en'],
          contentTypes: data.contentTypes || ['movie', 'tv'],
          notificationSettings: data.notificationSettings || {},
          viewingPreferencesText: data.viewingPreferencesText,
          learnedPreferences: data.learnedPreferences || {},
        })
        .returning();
      return newPrefs as UserPreferences;
    }

    // Update existing preferences
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.preferredGenres !== undefined) updateData.preferredGenres = data.preferredGenres;
    if (data.favoriteActors !== undefined) updateData.favoriteActors = data.favoriteActors;
    if (data.preferredLanguages !== undefined)
      updateData.preferredLanguages = data.preferredLanguages;
    if (data.contentTypes !== undefined) updateData.contentTypes = data.contentTypes;
    if (data.notificationSettings !== undefined)
      updateData.notificationSettings = data.notificationSettings;
    if (data.viewingPreferencesText !== undefined)
      updateData.viewingPreferencesText = data.viewingPreferencesText;
    if (data.learnedPreferences !== undefined)
      updateData.learnedPreferences = this.deduplicateLearnedPreferences(data.learnedPreferences);

    const [updated] = await db
      .update(userPreferences)
      .set(updateData)
      .where(eq(userPreferences.userId, userId))
      .returning();

    return updated as UserPreferences;
  }
}
