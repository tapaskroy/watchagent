import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LLMRecommendationService } from '../../services/recommendation/llm-recommendation.service';
import { TMDBService } from '../../services/external-apis/tmdb.service';
import { getRecommendationsSchema, GetRecommendationsRequest } from '@watchagent/shared';
import { handleRecommendationFeedback } from './feedback.controller';

export async function recommendationsRoutes(app: FastifyInstance) {
  const recommendationService = new LLMRecommendationService();
  const tmdbService = new TMDBService();

  /**
   * GET /api/v1/recommendations/personalized
   * Get personalized LLM-powered recommendations
   */
  app.get<{ Querystring: GetRecommendationsRequest }>(
    '/personalized',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get personalized AI-powered recommendations',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            refresh: {
              type: 'boolean',
              default: false,
              description: 'Force regenerate recommendations',
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 50,
              default: 20,
              description: 'Number of recommendations to return',
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const filters = getRecommendationsSchema.parse(request.query);

      // Generate recommendations (with force refresh if requested)
      const recommendations = await recommendationService.generateRecommendations(
        userId,
        filters.refresh || false
      );

      // Limit results if requested
      const limited = recommendations.slice(0, filters.limit || 20);

      return reply.send({
        success: true,
        data: limited,
        meta: {
          total: recommendations.length,
          algorithm: 'llm',
          cached: !filters.refresh,
        },
      });
    }
  );

  /**
   * GET /api/v1/recommendations/similar/:tmdbId
   * Get similar content recommendations
   */
  app.get<{
    Params: { tmdbId: string };
    Querystring: { type: 'movie' | 'tv'; limit?: number };
  }>(
    '/similar/:tmdbId',
    {
      schema: {
        description: 'Get similar content recommendations',
        tags: ['recommendations'],
        params: {
          type: 'object',
          required: ['tmdbId'],
          properties: {
            tmdbId: { type: 'string', description: 'TMDB content ID' },
          },
        },
        querystring: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['movie', 'tv'] },
            limit: { type: 'number', minimum: 1, maximum: 20, default: 10 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tmdbId } = request.params as any;
      const { type, limit = 10 } = request.query as any;

      // Get similar content from TMDB
      const similar = await tmdbService.getSimilar(type, tmdbId, 1);

      // Transform TMDB data to ContentCard format
      const transformedResults = (similar.results || []).slice(0, limit).map((item: any) => ({
        id: item.id.toString(),
        tmdbId: item.id.toString(),
        type: type,
        title: item.title || item.name || 'Unknown',
        releaseDate: item.release_date || item.first_air_date,
        posterPath: item.poster_path,
        tmdbRating: item.vote_average,
        genres: item.genre_ids ? item.genre_ids.map((id: number) => ({
          id,
          name: '' // Genre names not available in TMDB similar results
        })) : [],
        inWatchlist: false,
      }));

      return reply.send({
        success: true,
        data: transformedResults,
        meta: {
          total: similar.total_results || 0,
          algorithm: 'tmdb-similar',
        },
      });
    }
  );

  /**
   * GET /api/v1/recommendations/trending
   * Get trending recommendations
   */
  app.get<{
    Querystring: {
      type?: 'movie' | 'tv';
      timeWindow?: 'day' | 'week';
      limit?: number;
    };
  }>(
    '/trending',
    {
      schema: {
        description: 'Get trending content recommendations',
        tags: ['recommendations'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['movie', 'tv'] },
            timeWindow: { type: 'string', enum: ['day', 'week'], default: 'week' },
            limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type, timeWindow = 'week', limit = 20 } = request.query as any;

      const trending = await tmdbService.getTrending(type || 'all', timeWindow);

      // Transform TMDB data to ContentCard format
      const transformedResults = (trending.results || []).slice(0, limit).map((item: any) => ({
        id: item.id.toString(),
        tmdbId: item.id.toString(),
        type: item.media_type === 'tv' ? 'tv' : 'movie', // Handle mixed content
        title: item.title || item.name || 'Unknown',
        releaseDate: item.release_date || item.first_air_date,
        posterPath: item.poster_path,
        tmdbRating: item.vote_average,
        genres: item.genre_ids ? item.genre_ids.map((id: number) => ({
          id,
          name: '' // Genre names not available in TMDB trending results
        })) : [],
        inWatchlist: false,
      }));

      return reply.send({
        success: true,
        data: transformedResults,
        meta: {
          total: trending.total_results || 0,
          algorithm: 'trending',
          timeWindow,
        },
      });
    }
  );

  /**
   * POST /api/v1/recommendations/refresh
   * Force refresh user recommendations
   */
  app.post(
    '/refresh',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Force refresh personalized recommendations',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      // Generate fresh recommendations with force refresh
      const recommendations = await recommendationService.generateRecommendations(userId, true);

      return reply.send({
        success: true,
        data: recommendations,
        meta: {
          total: recommendations.length,
          algorithm: 'llm',
          cached: false,
          message: 'Recommendations refreshed successfully',
        },
      });
    }
  );

  /**
   * POST /api/v1/recommendations/feedback
   * Submit feedback on a recommendation
   */
  app.post(
    '/feedback',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Submit feedback on a recommendation to update user preferences',
        tags: ['recommendations'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['contentTitle', 'action'],
          properties: {
            contentId: { type: 'string' },
            tmdbId: { type: 'string' },
            type: { type: 'string', enum: ['movie', 'tv'] },
            contentTitle: { type: 'string' },
            action: { type: 'string', enum: ['not_relevant', 'keep', 'watchlist', 'watched'] },
            rating: { type: 'number', minimum: 1, maximum: 5 },
          },
        },
      },
    },
    handleRecommendationFeedback
  );
}
