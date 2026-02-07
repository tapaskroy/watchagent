import { db } from '@watchagent/database';
import { userPreferences, ratings, watchlistItems, follows } from '@watchagent/database';
import { eq, and, desc, inArray, gt } from 'drizzle-orm';
import {
  EnhancedUserContext,
  ConversationMemory,
  RatingInsights,
  ConversationSummary,
  RatingPatterns,
} from '@watchagent/shared';
import { logError, logInfo } from '../../config/logger';
import { ConversationSummaryService } from '../conversation/conversation-summary.service';
import { RatingAnalysisService } from '../analysis/rating-analysis.service';

export class UserContextService {
  private conversationSummaryService: ConversationSummaryService;
  private ratingAnalysisService: RatingAnalysisService;

  constructor() {
    this.conversationSummaryService = new ConversationSummaryService();
    this.ratingAnalysisService = new RatingAnalysisService();
  }

  /**
   * Build rich user context including conversation memory and rating patterns
   */
  async buildRichUserContext(userId: string): Promise<EnhancedUserContext | null> {
    try {
      logInfo('Building rich user context', { userId });

      // Get base user preferences
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      if (!prefs) {
        logInfo('No user preferences found', { userId });
        return null;
      }

      // Get conversation memory
      const conversationMemory = await this.getConversationMemory(userId, prefs);

      // Get rating insights
      const ratingInsights = await this.getRatingInsights(userId, prefs);

      // Get recent activity
      const userRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, userId),
        orderBy: [desc(ratings.createdAt)],
        limit: 20,
        with: {
          content: true,
        },
      });

      const userWatchlist = await db.query.watchlistItems.findMany({
        where: eq(watchlistItems.userId, userId),
        limit: 20,
        orderBy: [desc(watchlistItems.addedAt)],
        with: {
          content: true,
        },
      });

      // Get social context
      const userFollows = await db.query.follows.findMany({
        where: eq(follows.followerId, userId),
        limit: 10,
      });

      const friendIds = userFollows.map(f => f.followingId);
      let friendsWatching: string[] = [];

      if (friendIds.length > 0) {
        const friendRatings = await db.query.ratings.findMany({
          where: and(inArray(ratings.userId, friendIds), gt(ratings.rating, '7.0')),
          orderBy: [desc(ratings.createdAt)],
          limit: 10,
          with: {
            content: true,
          },
        });

        friendsWatching = friendRatings.map(r => r.content.title);
      }

      // Extract learned preferences
      const learnedPrefs = (prefs.learnedPreferences as any) || {};
      const learnedGenreNames = (learnedPrefs.favoriteGenres as string[]) || [];
      const learnedActors = (learnedPrefs.favoriteActors as string[]) || [];
      const moodPreferences = (learnedPrefs.moodPreferences as string[]) || [];
      const dislikes = (learnedPrefs.dislikes as string[]) || [];

      // Convert genre names to IDs
      const learnedGenreIds = this.genreNamesToIds(learnedGenreNames);

      // Merge explicit and learned preferences
      const allGenres = Array.from(
        new Set([...(prefs.preferredGenres as number[]), ...learnedGenreIds])
      );
      const allActors = Array.from(
        new Set([...(prefs.favoriteActors as string[]), ...learnedActors])
      );

      // Build enhanced context
      const context: EnhancedUserContext = {
        userProfile: {
          preferredGenres: allGenres,
          favoriteActors: allActors,
          preferredLanguages: prefs.preferredLanguages as string[],
          contentTypes: prefs.contentTypes as ('movie' | 'tv')[],
          moodPreferences,
          dislikes,
        },
        conversationMemory,
        ratingInsights,
        recentActivity: {
          watched: userRatings.map(r => ({
            title: r.content.title,
            rating: parseFloat(r.rating),
            review: r.review || undefined,
            watchedAt: r.updatedAt || r.createdAt,
          })),
          watchlist: userWatchlist.map(w => ({
            title: w.content.title,
            notes: w.notes || undefined,
            priority: w.priority || undefined,
          })),
          watchlistCount: userWatchlist.length,
        },
        socialContext: {
          friendsWatching,
          trendingInNetwork: [],
        },
      };

      logInfo('Rich user context built successfully', {
        userId,
        hasOnboardingSummary: !!conversationMemory.onboardingSummary,
        recentConversations: conversationMemory.recentConversationInsights.length,
        totalRatings: ratingInsights.averageRating > 0,
      });

      return context;
    } catch (error) {
      logError(error as Error, { userId, service: 'UserContextService.buildRichUserContext' });
      return null;
    }
  }

  /**
   * Get conversation memory for user
   */
  private async getConversationMemory(
    userId: string,
    prefs: any
  ): Promise<ConversationMemory> {
    try {
      let conversationSummary = prefs.conversationSummary as ConversationSummary | null;

      // If no summary exists, generate it
      if (!conversationSummary || !conversationSummary.onboardingConversation) {
        logInfo('No conversation summary found, generating...', { userId });
        await this.conversationSummaryService.updateUserConversationSummary(userId);

        // Refetch preferences
        const updatedPrefs = await db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, userId),
        });

        conversationSummary = updatedPrefs?.conversationSummary as ConversationSummary | null;
      }

      if (!conversationSummary) {
        return {
          onboardingSummary: '',
          onboardingKeyPoints: [],
          recentConversationInsights: [],
        };
      }

      const onboarding = conversationSummary.onboardingConversation;
      const recent = conversationSummary.recentConversations || [];

      return {
        onboardingSummary: onboarding?.summary || '',
        onboardingKeyPoints: onboarding?.keyPoints || [],
        recentConversationInsights: recent.map(r => r.summary),
      };
    } catch (error) {
      logError(error as Error, { userId, service: 'UserContextService.getConversationMemory' });
      return {
        onboardingSummary: '',
        onboardingKeyPoints: [],
        recentConversationInsights: [],
      };
    }
  }

  /**
   * Get rating insights for user
   */
  private async getRatingInsights(userId: string, prefs: any): Promise<RatingInsights> {
    try {
      let ratingPatterns = prefs.ratingPatterns as RatingPatterns | null;

      // Check if patterns need refresh
      const needsRefresh = await this.ratingAnalysisService.shouldRefreshPatterns(userId);

      if (!ratingPatterns || needsRefresh) {
        logInfo('Rating patterns need refresh, analyzing...', { userId });
        ratingPatterns = await this.ratingAnalysisService.analyzeAndUpdateRatingPatterns(userId);
      }

      if (!ratingPatterns) {
        return {
          genrePreferences: {},
          averageRating: 0,
          ratingDistribution: {},
          qualityThreshold: 7.0,
        };
      }

      return {
        genrePreferences: ratingPatterns.genreAverages,
        averageRating: ratingPatterns.averageRating,
        ratingDistribution: ratingPatterns.ratingDistribution,
        qualityThreshold: ratingPatterns.qualityThreshold,
      };
    } catch (error) {
      logError(error as Error, { userId, service: 'UserContextService.getRatingInsights' });
      return {
        genrePreferences: {},
        averageRating: 0,
        ratingDistribution: {},
        qualityThreshold: 7.0,
      };
    }
  }

  /**
   * Convert genre names to TMDB genre IDs
   */
  private genreNamesToIds(genreNames: string[]): number[] {
    const genreIds: number[] = [];
    const genreNameMap: Record<string, number> = {
      'action': 28,
      'adventure': 12,
      'animation': 16,
      'comedy': 35,
      'crime': 80,
      'documentary': 99,
      'drama': 18,
      'family': 10751,
      'fantasy': 14,
      'history': 36,
      'horror': 27,
      'music': 10402,
      'mystery': 9648,
      'romance': 10749,
      'science fiction': 878,
      'sci-fi': 878,
      'scifi': 878,
      'thriller': 53,
      'war': 10752,
      'western': 37,
    };

    genreNames.forEach(name => {
      const normalized = name.toLowerCase().trim();
      const id = genreNameMap[normalized];
      if (id && !genreIds.includes(id)) {
        genreIds.push(id);
      }
    });

    return genreIds;
  }
}
