import { db } from '@watchagent/database';
import {
  users,
  userPreferences,
  content,
  ratings,
  watchlistItems,
  recommendations,
  follows,
} from '@watchagent/database';
import { eq, desc, and, inArray, gt } from 'drizzle-orm';
import { callClaude } from '../../config/anthropic';
import { CacheService, cacheKeys } from '../../config/redis';
import { TMDBService } from '../external-apis/tmdb.service';
import {
  Recommendation,
  RecommendationContext,
  RECOMMENDATION_CONFIG,
  CACHE_TTL,
} from '@watchagent/shared';
import { logError, logDebug, logInfo } from '../../config/logger';

interface ContentCandidate {
  tmdb_id: string;
  title: string;
  genres: string[];
  rating: number;
  popularity: number;
  overview: string;
}

interface ParsedRecommendation {
  tmdb_id: string;
  title: string;
  confidence_score: number;
  reason: string;
}

export class LLMRecommendationService {
  private tmdb: TMDBService;

  constructor() {
    this.tmdb = new TMDBService();
  }

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendations(userId: string): Promise<Recommendation[]> {
    logInfo('Generating recommendations for user', { userId });

    // 1. Check cache (24hr TTL)
    const cached = await this.getCachedRecommendations(userId);
    if (cached && cached.length > 0) {
      logDebug('Recommendations found in cache', { userId, count: cached.length });
      return cached;
    }

    // 2. Build user context
    const context = await this.buildUserContext(userId);
    if (!context) {
      logError(new Error('Failed to build user context'), { userId });
      return [];
    }

    // 3. Get candidate content
    const candidates = await this.getCandidateContent(context);
    if (candidates.length === 0) {
      logError(new Error('No candidate content found'), { userId });
      return [];
    }

    logDebug('Generated candidates', { userId, candidateCount: candidates.length });

    // 4. Generate prompt
    const prompt = this.buildRecommendationPrompt(context, candidates);

    // 5. Call Claude Sonnet API
    let responseText: string;
    try {
      responseText = await callClaude(prompt);
    } catch (error) {
      logError(error as Error, { userId, service: 'LLMRecommendation' });
      return [];
    }

    // 6. Parse and validate recommendations
    const parsedRecommendations = this.parseRecommendations(responseText);
    if (parsedRecommendations.length === 0) {
      logError(new Error('No recommendations parsed from LLM response'), { userId });
      return [];
    }

    // 7. Enrich with full content data from database
    const enriched = await this.enrichRecommendations(userId, parsedRecommendations);

    // 8. Store in database and cache
    await this.storeRecommendations(userId, enriched);
    await this.cacheRecommendations(userId, enriched);

    logInfo('Recommendations generated successfully', {
      userId,
      count: enriched.length,
    });

    return enriched;
  }

  /**
   * Get cached recommendations
   */
  private async getCachedRecommendations(userId: string): Promise<Recommendation[] | null> {
    // Check Redis cache first
    const cacheKey = cacheKeys.recommendations(userId);
    const cached = await CacheService.get<Recommendation[]>(cacheKey);
    if (cached) return cached;

    // Check database for non-expired recommendations
    const dbRecommendations = await db.query.recommendations.findMany({
      where: and(
        eq(recommendations.userId, userId),
        gt(recommendations.expiresAt, new Date())
      ),
      orderBy: [desc(recommendations.score)],
      limit: RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS,
      with: {
        content: true,
      },
    });

    if (dbRecommendations.length > 0) {
      return dbRecommendations as Recommendation[];
    }

    return null;
  }

  /**
   * Build user context for recommendations
   */
  private async buildUserContext(userId: string): Promise<RecommendationContext | null> {
    try {
      // Get user preferences
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      if (!prefs) return null;

      // Get recent ratings and watchlist
      const userRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, userId),
        orderBy: [desc(ratings.createdAt)],
        limit: 20,
        with: {
          content: true,
        },
      });

      const userWatchlist = await db.query.watchlistItems.findMany({
        where: and(eq(watchlistItems.userId, userId), eq(watchlistItems.status, 'to_watch')),
        limit: 10,
        with: {
          content: true,
        },
      });

      // Get friends' activity (users they follow)
      const userFollows = await db.query.follows.findMany({
        where: eq(follows.followerId, userId),
        limit: 10,
      });

      const friendIds = userFollows.map((f) => f.followingId);
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

        friendsWatching = friendRatings.map((r) => r.content.title);
      }

      return {
        userProfile: {
          preferredGenres: prefs.preferredGenres as number[],
          favoriteActors: prefs.favoriteActors as string[],
          preferredLanguages: prefs.preferredLanguages as string[],
          contentTypes: prefs.contentTypes as ('movie' | 'tv')[],
        },
        recentActivity: {
          watched: userRatings.map((r) => ({
            title: r.content.title,
            rating: parseFloat(r.rating),
            review: r.review || undefined,
          })),
          watchlist: userWatchlist.map((w) => w.content.title),
        },
        socialContext: {
          friendsWatching,
          trendingInNetwork: [], // Can be populated with trending content among friends
        },
      };
    } catch (error) {
      logError(error as Error, { userId, service: 'LLMRecommendation' });
      return null;
    }
  }

  /**
   * Get candidate content for recommendations
   */
  private async getCandidateContent(context: RecommendationContext): Promise<ContentCandidate[]> {
    const candidates = new Map<string, ContentCandidate>();

    try {
      // 1. Get trending content (200)
      const trendingData = await this.tmdb.getTrending('all', 'week');
      const trending = (trendingData.results || []).slice(0, 200);
      trending.forEach((item: any) => {
        if (!candidates.has(item.id.toString())) {
          candidates.set(item.id.toString(), {
            tmdb_id: item.id.toString(),
            title: item.title || item.name,
            genres: (item.genre_ids || []).map((id: number) => id.toString()),
            rating: item.vote_average || 0,
            popularity: item.popularity || 0,
            overview: (item.overview || '').substring(0, 150),
          });
        }
      });

      // 2. Get content matching preferred genres (150)
      if (context.userProfile.preferredGenres.length > 0) {
        const contentTypes: ('movie' | 'tv')[] = context.userProfile.contentTypes;

        for (const type of contentTypes) {
          const genreMatches = await this.tmdb.discover(type, {
            genres: context.userProfile.preferredGenres,
            sortBy: 'vote_average.desc',
            page: 1,
          });

          (genreMatches.results || []).slice(0, 75).forEach((item: any) => {
            if (!candidates.has(item.id.toString())) {
              candidates.set(item.id.toString(), {
                tmdb_id: item.id.toString(),
                title: item.title || item.name,
                genres: (item.genre_ids || []).map((id: number) => id.toString()),
                rating: item.vote_average || 0,
                popularity: item.popularity || 0,
                overview: (item.overview || '').substring(0, 150),
              });
            }
          });
        }
      }

      // 3. Get high-rated content (100)
      const contentTypes: ('movie' | 'tv')[] = context.userProfile.contentTypes;
      for (const type of contentTypes) {
        const topRated = await this.tmdb.getTopRated(type, 1);
        (topRated.results || []).slice(0, 50).forEach((item: any) => {
          if (!candidates.has(item.id.toString())) {
            candidates.set(item.id.toString(), {
              tmdb_id: item.id.toString(),
              title: item.title || item.name,
              genres: (item.genre_ids || []).map((id: number) => id.toString()),
              rating: item.vote_average || 0,
              popularity: item.popularity || 0,
              overview: (item.overview || '').substring(0, 150),
            });
          }
        });
      }

      // 4. Get new releases in preferred genres (50)
      for (const type of contentTypes) {
        const newReleases = await this.tmdb.discover(type, {
          genres: context.userProfile.preferredGenres,
          sortBy: 'release_date.desc',
          page: 1,
        });

        (newReleases.results || []).slice(0, 25).forEach((item: any) => {
          if (!candidates.has(item.id.toString())) {
            candidates.set(item.id.toString(), {
              tmdb_id: item.id.toString(),
              title: item.title || item.name,
              genres: (item.genre_ids || []).map((id: number) => id.toString()),
              rating: item.vote_average || 0,
              popularity: item.popularity || 0,
              overview: (item.overview || '').substring(0, 150),
            });
          }
        });
      }

      // Return top 500 diverse candidates
      return Array.from(candidates.values()).slice(0, RECOMMENDATION_CONFIG.CANDIDATE_POOL_SIZE);
    } catch (error) {
      logError(error as Error, { service: 'LLMRecommendation', method: 'getCandidateContent' });
      return [];
    }
  }

  /**
   * Build recommendation prompt for Claude
   */
  private buildRecommendationPrompt(
    context: RecommendationContext,
    candidates: ContentCandidate[]
  ): string {
    const watchedList =
      context.recentActivity.watched.length > 0
        ? context.recentActivity.watched
            .map(
              (w) =>
                `- "${w.title}" - Rated ${w.rating}/10${w.review ? ` - "${w.review}"` : ''}`
            )
            .join('\n')
        : 'No recent ratings';

    const watchlistStr =
      context.recentActivity.watchlist.length > 0
        ? context.recentActivity.watchlist.join(', ')
        : 'Empty watchlist';

    const friendsWatchingStr =
      context.socialContext.friendsWatching.length > 0
        ? context.socialContext.friendsWatching.join(', ')
        : 'No friends activity';

    const candidatesStr = candidates
      .map(
        (c) =>
          `[${c.tmdb_id}] "${c.title}" - Genres: ${c.genres.join(', ')} - Rating: ${c.rating}/10 - ${c.overview}...`
      )
      .join('\n');

    return `You are an expert movie and TV show recommendation system. Analyze the user's viewing history and preferences to suggest ${RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS} highly personalized recommendations.

USER PROFILE:
Favorite Genres: ${context.userProfile.preferredGenres.join(', ') || 'None specified'}
Favorite Actors: ${context.userProfile.favoriteActors.join(', ') || 'None specified'}
Content Preferences: ${context.userProfile.contentTypes.join(', ')}

RECENTLY WATCHED & RATED (most recent first):
${watchedList}

CURRENT WATCHLIST:
${watchlistStr}

SOCIAL CONTEXT:
Friends are watching: ${friendsWatchingStr}

AVAILABLE CONTENT DATABASE:
Here are ${candidates.length} trending and popular titles to choose from:
${candidatesStr}

INSTRUCTIONS:
1. Analyze the user's viewing patterns, ratings, and preferences
2. Consider genre preferences, but don't be too restrictive - surprise the user with adjacent genres they might enjoy
3. Pay attention to rating patterns - if they rate certain types of content higher, prioritize similar content
4. Use their reviews to understand nuanced preferences (e.g., "too slow" might indicate preference for fast-paced content)
5. Consider social context but don't weight it too heavily (10-15% influence)
6. Provide a mix of: well-known titles (60%), hidden gems (30%), and recent releases (10%)
7. Each recommendation should have a compelling, personalized reason

OUTPUT FORMAT (valid JSON only):
{
  "recommendations": [
    {
      "tmdb_id": "12345",
      "title": "Movie Title",
      "confidence_score": 0.95,
      "reason": "One compelling sentence explaining why this matches their taste, referencing specific movies they've enjoyed or preferences they've shown."
    }
  ]
}

Generate exactly ${RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS} recommendations. Return ONLY the JSON, no additional text.`;
  }

  /**
   * Parse recommendations from Claude response
   */
  private parseRecommendations(response: string): ParsedRecommendation[] {
    try {
      // Extract JSON from response (might have extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logError(new Error('No JSON found in LLM response'), { response });
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        logError(new Error('Invalid recommendations structure'), { parsed });
        return [];
      }

      return parsed.recommendations;
    } catch (error) {
      logError(error as Error, { response, service: 'LLMRecommendation' });
      return [];
    }
  }

  /**
   * Enrich recommendations with full content data
   */
  private async enrichRecommendations(
    userId: string,
    parsedRecommendations: ParsedRecommendation[]
  ): Promise<Recommendation[]> {
    const enriched: Recommendation[] = [];

    for (const rec of parsedRecommendations) {
      try {
        // Find content in database by TMDB ID
        const contentData = await db.query.content.findFirst({
          where: eq(content.tmdbId, rec.tmdb_id),
        });

        if (contentData) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour TTL

          enriched.push({
            id: '', // Will be generated by database
            userId,
            contentId: contentData.id,
            score: rec.confidence_score,
            reason: rec.reason,
            algorithm: 'llm',
            metadata: {},
            createdAt: new Date(),
            expiresAt,
            content: contentData as any,
          });
        }
      } catch (error) {
        logError(error as Error, { tmdbId: rec.tmdb_id });
      }
    }

    return enriched;
  }

  /**
   * Store recommendations in database
   */
  private async storeRecommendations(userId: string, recs: Recommendation[]): Promise<void> {
    try {
      // Delete old recommendations for this user
      await db
        .delete(recommendations)
        .where(eq(recommendations.userId, userId));

      // Insert new recommendations
      if (recs.length > 0) {
        await db.insert(recommendations).values(
          recs.map((r) => ({
            userId: r.userId,
            contentId: r.contentId,
            score: r.score.toString(),
            reason: r.reason,
            algorithm: r.algorithm,
            metadata: r.metadata,
            expiresAt: r.expiresAt,
          }))
        );
      }
    } catch (error) {
      logError(error as Error, { userId, service: 'LLMRecommendation' });
    }
  }

  /**
   * Cache recommendations in Redis
   */
  private async cacheRecommendations(userId: string, recs: Recommendation[]): Promise<void> {
    const cacheKey = cacheKeys.recommendations(userId);
    await CacheService.set(cacheKey, recs, CACHE_TTL.RECOMMENDATIONS);
  }
}
