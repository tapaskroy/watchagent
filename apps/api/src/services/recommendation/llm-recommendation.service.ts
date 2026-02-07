import { db } from '@watchagent/database';
import {
  content,
  recommendations,
} from '@watchagent/database';
import { eq, desc, and, gt } from 'drizzle-orm';
import { callClaude } from '../../config/anthropic';
import { CacheService, cacheKeys } from '../../config/redis';
import { TMDBService } from '../external-apis/tmdb.service';
import {
  Recommendation,
  RECOMMENDATION_CONFIG,
  CACHE_TTL,
  GENRE_NAMES,
  EnhancedUserContext,
} from '@watchagent/shared';
import { logError, logDebug, logInfo } from '../../config/logger';
import { UserContextService } from './user-context.service';

interface ContentCandidate {
  tmdb_id: string;
  title: string;
  type: 'movie' | 'tv';
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
  private userContextService: UserContextService;

  constructor() {
    this.tmdb = new TMDBService();
    this.userContextService = new UserContextService();
  }

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendations(userId: string, forceRefresh: boolean = false): Promise<Recommendation[]> {
    logInfo('Generating recommendations for user', { userId, forceRefresh });

    // 1. Check cache (6hr TTL) unless forceRefresh is true
    // Reduced from 24hr to 6hr to allow for more dynamic recommendations
    if (!forceRefresh) {
      const cached = await this.getCachedRecommendations(userId);
      if (cached && cached.length > 0) {
        // Check if cache is still fresh (6 hours)
        const oldestRec = cached[0];
        const cacheAge = Date.now() - new Date(oldestRec.createdAt).getTime();
        const SIX_HOURS = 6 * 60 * 60 * 1000;

        if (cacheAge < SIX_HOURS) {
          logDebug('Recommendations found in cache', { userId, count: cached.length, ageHours: (cacheAge / (60 * 60 * 1000)).toFixed(1) });
          return cached;
        } else {
          logInfo('Cache expired, generating fresh recommendations', { userId });
        }
      }
    } else {
      logInfo('Skipping cache due to forceRefresh', { userId });
      // Clear existing cache and DB recommendations
      await this.clearRecommendations(userId);
    }

    // 2. Build rich user context (includes conversation memory and rating patterns)
    const richContext = await this.userContextService.buildRichUserContext(userId);
    if (!richContext) {
      logError(new Error('Failed to build user context'), { userId });
      return [];
    }

    // 3. Generate enhanced prompt with full context (no candidate list - let Claude choose freely)
    const prompt = this.buildEnhancedRecommendationPrompt(richContext);

    // 4. Call Claude Sonnet API
    let responseText: string;
    try {
      responseText = await callClaude(prompt);
    } catch (error) {
      logError(error as Error, { userId, service: 'LLMRecommendation' });
      return [];
    }

    // 5. Parse and validate recommendations
    const parsedRecommendations = this.parseRecommendations(responseText);
    if (parsedRecommendations.length === 0) {
      logError(new Error('No recommendations parsed from LLM response'), { userId });
      return [];
    }

    // 7. Enrich with full content data from database (validate TMDB IDs)
    const enriched = await this.enrichRecommendations(userId, parsedRecommendations);

    // 7.5. Remove duplicates by contentId (keep first occurrence with highest score)
    const seen = new Set<string>();
    const deduplicated = enriched.filter(rec => {
      if (seen.has(rec.contentId)) {
        logInfo('Removing duplicate recommendation', {
          userId,
          contentId: rec.contentId,
          title: rec.content?.title
        });
        return false;
      }
      seen.add(rec.contentId);
      return true;
    });

    if (deduplicated.length < enriched.length) {
      logInfo('Removed duplicates from recommendations', {
        userId,
        originalCount: enriched.length,
        deduplicatedCount: deduplicated.length,
        removedCount: enriched.length - deduplicated.length
      });
    }

    // 7.6. Check if we have enough recommendations (some may have been invalid TMDB IDs)
    if (deduplicated.length < RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS) {
      logInfo('Insufficient valid recommendations after validation', {
        userId,
        validCount: deduplicated.length,
        targetCount: RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS,
        parsedCount: parsedRecommendations.length
      });

      // Note: We accept fewer than 20 recommendations rather than retry
      // This prevents infinite loops and provides faster response
      // Future improvement: Could implement retry with feedback about invalid IDs
    }

    // 8. Store in database
    await this.storeRecommendations(userId, deduplicated);

    // 9. Refetch from database to get recommendations with real IDs
    const storedRecommendations = await db.query.recommendations.findMany({
      where: eq(recommendations.userId, userId),
      orderBy: [desc(recommendations.score)],
      limit: RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS,
      with: {
        content: true,
      },
    });

    // Transform to Recommendation[] type
    const recsWithIds = storedRecommendations.map((rec: any) => ({
      ...rec,
      score: parseFloat(rec.score),
    })) as Recommendation[];

    // 10. Cache recommendations with IDs
    await this.cacheRecommendations(userId, recsWithIds);

    logInfo('Recommendations generated successfully', {
      userId,
      count: recsWithIds.length,
    });

    return recsWithIds;
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
      // Transform score from string to number
      return dbRecommendations.map((rec: any) => ({
        ...rec,
        score: parseFloat(rec.score),
      })) as Recommendation[];
    }

    return null;
  }

  /**
   * Build user context for recommendations
  // @ts-ignore - Deprecated but kept for reference
   */

  /**
   * Get candidate content for recommendations
   */

  /**
   * Get contextual time information for recommendations
   */
  private getTimeContext(): {
    timeOfDay: string;
    dayType: string;
    currentTime: string;
    season: string;
  } {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const month = now.getMonth(); // 0-11

    // Time of day
    let timeOfDay: string;
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Day type
    const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';

    // Season (Northern Hemisphere)
    let season: string;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';

    return {
      timeOfDay,
      dayType,
      currentTime: now.toLocaleString('en-US', {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      season,
    };
  }

  /**
   * Build enhanced recommendation prompt with full conversation memory and rating patterns
   */
  private buildEnhancedRecommendationPrompt(
    context: EnhancedUserContext
  ): string {
    // Get time context
    const timeContext = this.getTimeContext();

    // Calculate days since last activity
    let daysSinceLastActivity = 'unknown';
    if (context.recentActivity.watched.length > 0) {
      const lastWatched = context.recentActivity.watched[0];
      if (lastWatched.watchedAt) {
        const daysDiff = Math.floor(
          (Date.now() - new Date(lastWatched.watchedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        daysSinceLastActivity = daysDiff === 0 ? 'today' : daysDiff === 1 ? 'yesterday' : `${daysDiff} days ago`;
      }
    }

    // Format watched list
    const watchedList =
      context.recentActivity.watched.length > 0
        ? context.recentActivity.watched
            .map((w) => `- "${w.title}" - Rated ${w.rating}/10${w.review ? ` - "${w.review}"` : ''}`)
            .join('\n')
        : 'No recent ratings';

    // Format watchlist with notes
    const watchlistStr =
      context.recentActivity.watchlist.length > 0
        ? context.recentActivity.watchlist
            .map((w) => {
              let str = `- "${w.title}"`;
              if (w.notes) str += ` - Note: ${w.notes}`;
              if (w.priority) str += ` [Priority: ${w.priority}]`;
              return str;
            })
            .join('\n')
        : 'Empty watchlist';

    // Format friends watching
    const friendsWatchingStr =
      context.socialContext.friendsWatching.length > 0
        ? context.socialContext.friendsWatching.join(', ')
        : 'No friends activity';

    // Format genre preferences from rating patterns
    const genrePreferencesStr =
      Object.keys(context.ratingInsights.genrePreferences).length > 0
        ? Object.entries(context.ratingInsights.genrePreferences)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([genreId, avgRating]) => `- ${GENRE_NAMES[parseInt(genreId)] || genreId}: ${avgRating.toFixed(1)}/10`)
            .join('\n')
        : 'Not enough rating data';

    return `You are an expert movie and TV show recommendation system with deep knowledge of the user's preferences from past conversations and TMDB (The Movie Database).

IMPORTANT: You have access to your training data about movies and TV shows from TMDB. Recommend content by providing valid TMDB IDs from your knowledge. Choose from the vast catalog of movies and TV shows you know about.

CURRENT CONTEXT (adapt recommendations to this):
🕐 Time: ${timeContext.currentTime} (${timeContext.timeOfDay} on a ${timeContext.dayType})
📅 Season: ${timeContext.season}
🎬 Last Activity: ${daysSinceLastActivity}

${timeContext.timeOfDay === 'morning' ? '→ Morning mood: Suggest lighter, uplifting, or inspiring content'
  : timeContext.timeOfDay === 'afternoon' ? '→ Afternoon mood: Suggest engaging, thought-provoking content'
  : timeContext.timeOfDay === 'evening' ? '→ Evening mood: Prime time for their favorite genres and popular picks'
  : '→ Late night mood: Consider intense thrillers, deep dramas, or comfort rewatches'}

${timeContext.dayType === 'weekend' ? '→ Weekend: More time for longer content, series binges, or epic movies'
  : '→ Weekday: Consider shorter content or quick episodes they can finish'}

USER BACKGROUND (from initial onboarding conversation):
${context.conversationMemory.onboardingSummary || 'No onboarding conversation available'}

Key preferences discovered during onboarding:
${context.conversationMemory.onboardingKeyPoints.length > 0
  ? context.conversationMemory.onboardingKeyPoints.map(p => `- ${p}`).join('\n')
  : '- No specific key points recorded'}

CURRENT USER PROFILE:
Favorite Genres: ${context.userProfile.preferredGenres.map(id => GENRE_NAMES[id] || id).join(', ') || 'None specified'}
Favorite Actors/Directors: ${context.userProfile.favoriteActors.join(', ') || 'None specified'}
Preferred Languages: ${context.userProfile.preferredLanguages.join(', ')}
Content Types: ${context.userProfile.contentTypes.join(', ')}

MOOD PREFERENCES (what they like):
${context.userProfile.moodPreferences.length > 0
  ? context.userProfile.moodPreferences.map(m => `- ${m}`).join('\n')
  : 'No specific mood preferences mentioned'}

DISLIKES (avoid these):
${context.userProfile.dislikes.length > 0
  ? context.userProfile.dislikes.map(d => `- ${d}`).join('\n')
  : 'No specific dislikes mentioned'}

RATING PATTERNS (shows user's taste from ${context.ratingInsights.averageRating > 0 ? 'their ratings' : 'limited data'}):
${context.ratingInsights.averageRating > 0 ? `Average Rating: ${context.ratingInsights.averageRating.toFixed(1)}/10
Quality Threshold: User typically rates good content ${context.ratingInsights.qualityThreshold}+/10

Genre Preferences (by average rating):
${genrePreferencesStr}` : 'Not enough ratings to analyze patterns'}

RECENTLY WATCHED & RATED (most recent first):
${watchedList}

CURRENT WATCHLIST (${context.recentActivity.watchlistCount} items):
${watchlistStr}

RECENT CONVERSATION INSIGHTS:
${context.conversationMemory.recentConversationInsights.length > 0
  ? context.conversationMemory.recentConversationInsights.map(i => `- ${i}`).join('\n')
  : 'No recent conversations beyond onboarding'}

SOCIAL CONTEXT:
Friends are watching: ${friendsWatchingStr}

INSTRUCTIONS:
1. **ADAPT TO CURRENT CONTEXT** - It's ${timeContext.timeOfDay} on a ${timeContext.dayType}. Adjust recommendations accordingly:
   - Morning: Light, uplifting, inspirational
   - Afternoon: Engaging, thought-provoking
   - Evening: Their favorite genres, popular picks
   - Night: Intense, deep, or comfort content
   - Weekend: Longer content, binge-worthy series
   - Weekday: Shorter, easier to finish

2. **USE THE ONBOARDING CONVERSATION AS YOUR PRIMARY GUIDANCE** - The user explicitly told us their preferences

3. **CONSIDER THEIR ACTIVITY PATTERNS** - Last activity was ${daysSinceLastActivity}
   ${daysSinceLastActivity === 'today' || daysSinceLastActivity === 'yesterday'
     ? '- User is actively watching! Lean into their current momentum and recent interests'
     : '- User hasn\'t watched recently. Suggest compelling, can\'t-miss titles to re-engage them'}

4. Pay close attention to mood preferences and ABSOLUTELY AVOID content matching their dislikes

5. Consider their rating patterns - they have ${context.ratingInsights.qualityThreshold >= 8 ? 'high' : context.ratingInsights.qualityThreshold >= 6 ? 'medium' : 'lenient'} standards based on their quality threshold

6. Reference their watchlist notes to understand intent behind saves

7. Use recent conversation insights to adapt to their current mood

8. **PROVIDE VARIETY** - Mix familiar and new:
   - 40% Perfect matches to stated preferences
   - 30% Similar-but-new discoveries
   - 20% Timely picks based on current context (time/day/season)
   - 10% Pleasant surprises

9. If they have strong dislikes, filter those out completely

10. Each recommendation must have a personalized reason that references their SPECIFIC preferences from the onboarding or ratings

11. **NO DUPLICATES** - Each tmdb_id should appear only once in your recommendations

12. **VALID TMDB IDs ONLY** - Only recommend movies and TV shows that you know exist in TMDB
    - Use actual TMDB IDs from well-known content
    - Include a mix of popular, critically acclaimed, and hidden gems
    - Cover a range of years (recent releases + classics if they match preferences)
    - Prioritize content that's widely available and highly rated

OUTPUT FORMAT (valid JSON only):
{
  "recommendations": [
    {
      "tmdb_id": "12345",
      "title": "Movie Title",
      "confidence_score": 0.95,
      "reason": "Based on your love of [specific preference from onboarding] and your high ratings for [genre], this perfectly matches your taste for [mood/theme]."
    }
  ]
}

Generate exactly ${RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS} recommendations. Focus on QUALITY matches to their preferences over variety. Return ONLY the JSON, no additional text.`;
  }

  /**
   * Get candidate content with enhanced filtering based on dislikes
   * NOTE: Currently unused - we let Claude recommend freely from TMDB
   * Keeping for potential future use
   */
  // @ts-ignore - Deprecated but kept for reference
  private async getCandidateContentEnhanced(context: EnhancedUserContext): Promise<ContentCandidate[]> {
    const candidates = new Map<string, ContentCandidate>();

    try {
      // Get trending content
      const trending = await this.tmdb.getTrending('all', 'week');
      this.addCandidates(candidates, trending.results || [], 200);

      // Get content matching preferred genres (if any)
      if (context.userProfile.preferredGenres.length > 0) {
        for (const genreId of context.userProfile.preferredGenres.slice(0, 3)) {
          const genreContent = await this.tmdb.discover('movie', {
            genres: [genreId],
            page: 1,
          });
          this.addCandidates(candidates, genreContent.results || [], 50);
        }
      }

      // Get highly rated content
      const topRated = await this.tmdb.getTopRated('movie', 1);
      this.addCandidates(candidates, topRated.results || [], 100);

      // Get new releases in preferred genres
      if (context.userProfile.preferredGenres.length > 0) {
        for (const genreId of context.userProfile.preferredGenres.slice(0, 2)) {
          const newReleases = await this.tmdb.discover('movie', {
            genres: [genreId],
            sortBy: 'release_date.desc',
            page: 1,
          });
          this.addCandidates(candidates, newReleases.results || [], 50);
        }
      }

      return Array.from(candidates.values()).slice(0, RECOMMENDATION_CONFIG.CANDIDATE_POOL_SIZE);
    } catch (error) {
      logError(error as Error, { service: 'LLMRecommendation.getCandidateContentEnhanced' });
      return [];
    }
  }

  /**
   * Helper to add candidates to map
   * NOTE: Currently unused - kept for potential future use
   */
  // @ts-ignore - Deprecated but kept for reference
  private addCandidates(candidates: Map<string, ContentCandidate>, items: any[], limit: number): void {
    let added = 0;
    for (const item of items) {
      if (added >= limit) break;
      if (candidates.has(item.id.toString())) continue;

      const type = item.media_type === 'tv' ? 'tv' : 'movie';
      candidates.set(item.id.toString(), {
        tmdb_id: item.id.toString(),
        title: item.title || item.name,
        type,
        genres: (item.genre_ids || []).map((id: number) => id.toString()),
        rating: item.vote_average || 0,
        popularity: item.popularity || 0,
        overview: (item.overview || '').substring(0, 150),
      });
      added++;
    }
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
   * Enrich recommendations with full content data (validates TMDB IDs)
   */
  private async enrichRecommendations(
    userId: string,
    parsedRecommendations: ParsedRecommendation[]
  ): Promise<Recommendation[]> {
    const enriched: Recommendation[] = [];

    for (const rec of parsedRecommendations) {
      try {
        // Find content in database by TMDB ID
        let contentData = await db.query.content.findFirst({
          where: eq(content.tmdbId, rec.tmdb_id),
        });

        // If not found in database, fetch from TMDB and cache it
        if (!contentData) {
          logInfo('Validating and fetching content from TMDB', { tmdbId: rec.tmdb_id });

          // Try fetching as movie first, then TV if that fails
          let tmdbData: any = null;
          let contentType: 'movie' | 'tv' = 'movie';

          try {
            tmdbData = await this.tmdb.getMovieDetails(rec.tmdb_id);
            contentType = 'movie';
          } catch (movieError) {
            // If movie fetch fails, try TV
            try {
              tmdbData = await this.tmdb.getTVDetails(rec.tmdb_id);
              contentType = 'tv';
            } catch (tvError) {
              logError(new Error('Invalid TMDB ID - not found as movie or TV'), {
                tmdbId: rec.tmdb_id,
                title: rec.title,
                movieError: movieError instanceof Error ? movieError.message : 'Unknown',
                tvError: tvError instanceof Error ? tvError.message : 'Unknown'
              });
              continue; // Skip this recommendation
            }
          }

          // Transform and insert into database
          const newContent = await this.cacheContentFromTMDB(tmdbData, contentType);
          contentData = newContent;
        }

        if (contentData) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 6); // 6 hour TTL (matches cache)

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
        logError(error as Error, { tmdbId: rec.tmdb_id, service: 'enrichRecommendations' });
      }
    }

    return enriched;
  }

  /**
   * Cache content from TMDB into local database
   */
  private async cacheContentFromTMDB(tmdbData: any, type: 'movie' | 'tv') {
    try {
      // Transform TMDB data to our schema
      const contentRecord = {
        tmdbId: tmdbData.id.toString(),
        imdbId: tmdbData.imdb_id || null,
        type: type,
        title: tmdbData.title || tmdbData.name,
        originalTitle: tmdbData.original_title || tmdbData.original_name || null,
        overview: tmdbData.overview || null,
        releaseDate: tmdbData.release_date || tmdbData.first_air_date || null,
        runtime: tmdbData.runtime || tmdbData.episode_run_time?.[0] || null,
        genres: tmdbData.genres || [],
        posterPath: tmdbData.poster_path || null,
        backdropPath: tmdbData.backdrop_path || null,
        tmdbRating: tmdbData.vote_average?.toString() || null,
        tmdbVoteCount: tmdbData.vote_count || null,
        imdbRating: null,
        popularity: tmdbData.popularity?.toString() || null,
        language: tmdbData.original_language || null,
        cast: tmdbData.credits?.cast?.slice(0, 20) || [],
        crew: tmdbData.credits?.crew?.slice(0, 10) || [],
        productionCompanies: tmdbData.production_companies || [],
        keywords: tmdbData.keywords?.keywords || tmdbData.keywords?.results || [],
        trailerUrl: this.extractTrailerUrl(tmdbData.videos),
        budget: type === 'movie' ? tmdbData.budget || null : null,
        revenue: type === 'movie' ? tmdbData.revenue || null : null,
        status: tmdbData.status || null,
        numberOfSeasons: type === 'tv' ? tmdbData.number_of_seasons || null : null,
        numberOfEpisodes: type === 'tv' ? tmdbData.number_of_episodes || null : null,
      };

      // Insert into database
      const [inserted] = await db.insert(content).values(contentRecord).returning();

      logInfo('Content cached successfully', { tmdbId: contentRecord.tmdbId, title: contentRecord.title });

      return inserted;
    } catch (error) {
      logError(error as Error, { tmdbId: tmdbData.id, type, service: 'cacheContentFromTMDB' });
      throw error;
    }
  }

  /**
   * Extract YouTube trailer URL from TMDB videos
   */
  private extractTrailerUrl(videos: any): string | null {
    if (!videos?.results) return null;

    const trailer = videos.results.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    );

    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
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

  /**
   * Clear cached and stored recommendations for a user
   */
  private async clearRecommendations(userId: string): Promise<void> {
    try {
      // Clear Redis cache
      const cacheKey = cacheKeys.recommendations(userId);
      await CacheService.del(cacheKey);

      // Clear database recommendations
      await db
        .delete(recommendations)
        .where(eq(recommendations.userId, userId));

      logInfo('Cleared recommendations cache and database', { userId });
    } catch (error) {
      logError(error as Error, { userId, service: 'clearRecommendations' });
    }
  }
}
