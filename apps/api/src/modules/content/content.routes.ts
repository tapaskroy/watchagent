import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ContentAggregatorService } from '../../services/external-apis/aggregator.service';
import { contentSearchSchema, contentDetailsSchema, ContentType } from '@watchagent/shared';

export async function contentRoutes(app: FastifyInstance) {
  const contentService = new ContentAggregatorService();

  /**
   * GET /api/v1/content/search
   * Search for movies and TV shows
   */
  app.get<{
    Querystring: {
      query: string;
      type?: ContentType;
      page?: number;
    };
  }>(
    '/search',
    {
      schema: {
        description: 'Search for movies and TV shows',
        tags: ['content'],
        querystring: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['movie', 'tv'] },
            page: { type: 'number', minimum: 1, default: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { query, type, page = 1 } = request.query as any;

      const results = await contentService.search(query, type, page);

      return reply.send({
        success: true,
        data: results,
      });
    }
  );

  /**
   * GET /api/v1/content/:tmdbId
   * Get content details by TMDB ID
   */
  app.get<{
    Params: { tmdbId: string };
    Querystring: { type: ContentType };
  }>(
    '/:tmdbId',
    {
      schema: {
        description: 'Get content details by TMDB ID',
        tags: ['content'],
        params: {
          type: 'object',
          required: ['tmdbId'],
          properties: {
            tmdbId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['movie', 'tv'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tmdbId } = request.params as any;
      const { type } = request.query as any;

      const content = await contentService.getContentDetails(tmdbId, type);

      if (!content) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Content not found',
          },
        });
      }

      return reply.send({
        success: true,
        data: content,
      });
    }
  );

  /**
   * GET /api/v1/content/trending
   * Get trending content
   */
  app.get<{
    Querystring: {
      type?: ContentType;
      timeWindow?: 'day' | 'week';
    };
  }>(
    '/trending',
    {
      schema: {
        description: 'Get trending movies and TV shows',
        tags: ['content'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['movie', 'tv'] },
            timeWindow: { type: 'string', enum: ['day', 'week'], default: 'week' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type, timeWindow = 'week' } = request.query as any;

      const results = await contentService.getTrending(type, timeWindow);

      return reply.send({
        success: true,
        data: results,
      });
    }
  );

  /**
   * GET /api/v1/content/popular
   * Get popular content
   */
  app.get<{
    Querystring: {
      type: ContentType;
      page?: number;
    };
  }>(
    '/popular',
    {
      schema: {
        description: 'Get popular movies or TV shows',
        tags: ['content'],
        querystring: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['movie', 'tv'] },
            page: { type: 'number', minimum: 1, default: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type, page = 1 } = request.query as any;

      const results = await contentService.getPopular(type, page);

      return reply.send({
        success: true,
        data: results,
      });
    }
  );

  /**
   * GET /api/v1/content/discover
   * Discover content with filters
   */
  app.get<{
    Querystring: {
      type: ContentType;
      genres?: string;
      yearFrom?: number;
      yearTo?: number;
      ratingFrom?: number;
      ratingTo?: number;
      sortBy?: string;
      page?: number;
    };
  }>(
    '/discover',
    {
      schema: {
        description: 'Discover content with filters',
        tags: ['content'],
        querystring: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['movie', 'tv'] },
            genres: { type: 'string', description: 'Comma-separated genre IDs' },
            yearFrom: { type: 'number', minimum: 1900, maximum: 2100 },
            yearTo: { type: 'number', minimum: 1900, maximum: 2100 },
            ratingFrom: { type: 'number', minimum: 0, maximum: 10 },
            ratingTo: { type: 'number', minimum: 0, maximum: 10 },
            sortBy: { type: 'string', default: 'popularity.desc' },
            page: { type: 'number', minimum: 1, default: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type, genres, yearFrom, yearTo, ratingFrom, ratingTo, sortBy, page = 1 } =
        request.query as any;

      const filters: any = { page, sortBy };

      if (genres) {
        filters.genres = genres.split(',').map((id: string) => parseInt(id));
      }
      if (yearFrom) filters.yearFrom = yearFrom;
      if (yearTo) filters.yearTo = yearTo;
      if (ratingFrom) filters.ratingFrom = ratingFrom;
      if (ratingTo) filters.ratingTo = ratingTo;

      const results = await contentService.discover(type, filters);

      return reply.send({
        success: true,
        data: results,
      });
    }
  );
}
