import { TMDBService } from './tmdb.service';
import { OMDBService } from './omdb.service';
import { db } from '@watchagent/database';
import { content } from '@watchagent/database';
import { eq } from 'drizzle-orm';
import { Content, ContentType, Genre, CastMember, CrewMember } from '@watchagent/shared';
import { logError, logDebug } from '../../config/logger';

/**
 * Aggregator service that combines data from TMDB and OMDB
 * and stores it in the database for caching
 */
export class ContentAggregatorService {
  private tmdb: TMDBService;
  private omdb: OMDBService;

  constructor() {
    this.tmdb = new TMDBService();
    this.omdb = new OMDBService();
  }

  /**
   * Get content details by TMDB ID
   * Combines data from TMDB and OMDB, stores in database
   */
  async getContentDetails(tmdbId: string, type: ContentType): Promise<Content | null> {
    try {
      // Check if content exists in database
      const existingContent = await db.query.content.findFirst({
        where: eq(content.tmdbId, tmdbId),
      });

      // If content exists and was updated recently (within 7 days), return it
      if (existingContent) {
        const daysSinceUpdate =
          (Date.now() - new Date(existingContent.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) {
          logDebug('Content found in database', { tmdbId, type });
          return existingContent as Content;
        }
      }

      // Fetch from TMDB
      const tmdbData =
        type === 'movie'
          ? await this.tmdb.getMovieDetails(tmdbId)
          : await this.tmdb.getTVDetails(tmdbId);

      if (!tmdbData) {
        logError(new Error('Failed to fetch from TMDB'), { tmdbId, type });
        return existingContent as Content | null;
      }

      // Fetch from OMDB if IMDb ID is available
      let omdbData = null;
      if (tmdbData.imdb_id) {
        omdbData = await this.omdb.getByImdbId(tmdbData.imdb_id);
      }

      // Transform and combine data
      const transformedData = this.transformContentData(tmdbData, omdbData, type);

      // Update or insert into database
      if (existingContent) {
        await db
          .update(content)
          .set({
            ...transformedData,
            updatedAt: new Date(),
          })
          .where(eq(content.tmdbId, tmdbId));

        return {
          ...existingContent,
          ...transformedData,
          updatedAt: new Date(),
        } as Content;
      } else {
        const [newContent] = await db.insert(content).values(transformedData).returning();
        return newContent as Content;
      }
    } catch (error) {
      logError(error as Error, { tmdbId, type, service: 'ContentAggregator' });
      return null;
    }
  }

  /**
   * Search for content across TMDB
   */
  async search(
    query: string,
    type?: ContentType,
    page: number = 1
  ): Promise<{ results: any[]; totalPages: number; totalResults: number }> {
    try {
      const results = await this.tmdb.search(query, type, page);
      return {
        results: results.results || [],
        totalPages: results.total_pages || 0,
        totalResults: results.total_results || 0,
      };
    } catch (error) {
      logError(error as Error, { query, type, page, service: 'ContentAggregator' });
      return { results: [], totalPages: 0, totalResults: 0 };
    }
  }

  /**
   * Get trending content
   */
  async getTrending(type?: ContentType, timeWindow: 'day' | 'week' = 'week') {
    try {
      const mediaType = type || 'all';
      const results = await this.tmdb.getTrending(mediaType, timeWindow);
      return results.results || [];
    } catch (error) {
      logError(error as Error, { type, timeWindow, service: 'ContentAggregator' });
      return [];
    }
  }

  /**
   * Get popular content
   */
  async getPopular(type: ContentType, page: number = 1) {
    try {
      const results = await this.tmdb.getPopular(type, page);
      return {
        results: results.results || [],
        totalPages: results.total_pages || 0,
        totalResults: results.total_results || 0,
      };
    } catch (error) {
      logError(error as Error, { type, page, service: 'ContentAggregator' });
      return { results: [], totalPages: 0, totalResults: 0 };
    }
  }

  /**
   * Discover content with filters
   */
  async discover(type: ContentType, filters: any) {
    try {
      const results = await this.tmdb.discover(type, filters);
      return {
        results: results.results || [],
        totalPages: results.total_pages || 0,
        totalResults: results.total_results || 0,
      };
    } catch (error) {
      logError(error as Error, { type, filters, service: 'ContentAggregator' });
      return { results: [], totalPages: 0, totalResults: 0 };
    }
  }

  /**
   * Transform TMDB + OMDB data into our content format
   */
  private transformContentData(tmdbData: any, omdbData: any, type: ContentType) {
    // Extract genres
    const genres: Genre[] = (tmdbData.genres || []).map((g: any) => ({
      id: g.id,
      name: g.name,
    }));

    // Extract cast
    const cast: CastMember[] = (tmdbData.credits?.cast || []).slice(0, 20).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
      order: c.order,
    }));

    // Extract crew
    const crew: CrewMember[] = (tmdbData.credits?.crew || []).slice(0, 20).map((c: any) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
      profilePath: c.profile_path,
    }));

    // Extract keywords
    const keywords: string[] = (tmdbData.keywords?.keywords || tmdbData.keywords?.results || [])
      .map((k: any) => k.name)
      .slice(0, 10);

    // Get trailer URL
    const trailerVideo = (tmdbData.videos?.results || []).find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    );
    const trailerUrl = trailerVideo ? `https://www.youtube.com/watch?v=${trailerVideo.key}` : null;

    return {
      tmdbId: tmdbData.id.toString(),
      imdbId: tmdbData.imdb_id || omdbData?.imdbID || null,
      type,
      title: type === 'movie' ? tmdbData.title : tmdbData.name,
      originalTitle: type === 'movie' ? tmdbData.original_title : tmdbData.original_name,
      overview: tmdbData.overview,
      releaseDate: type === 'movie' ? tmdbData.release_date : tmdbData.first_air_date,
      runtime: type === 'movie' ? tmdbData.runtime : null,
      genres,
      posterPath: tmdbData.poster_path,
      backdropPath: tmdbData.backdrop_path,
      tmdbRating: tmdbData.vote_average?.toString(),
      tmdbVoteCount: tmdbData.vote_count,
      imdbRating: omdbData?.imdbRating ? parseFloat(omdbData.imdbRating).toString() : null,
      popularity: tmdbData.popularity?.toString(),
      language: tmdbData.original_language,
      cast,
      crew,
      productionCompanies: tmdbData.production_companies || [],
      keywords,
      trailerUrl,
      budget: type === 'movie' ? tmdbData.budget : null,
      revenue: type === 'movie' ? tmdbData.revenue : null,
      status: tmdbData.status,
      // TV-specific fields
      numberOfSeasons: type === 'tv' ? tmdbData.number_of_seasons : null,
      numberOfEpisodes: type === 'tv' ? tmdbData.number_of_episodes : null,
      episodeRuntime: type === 'tv' ? tmdbData.episode_run_time : null,
    };
  }
}
