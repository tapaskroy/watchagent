import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RatingsService } from '../../services/ratings/ratings.service';
import {
  createRatingSchema,
  updateRatingSchema,
  getRatingsSchema,
  CreateRatingRequest,
  UpdateRatingRequest,
  GetRatingsRequest,
} from '@watchagent/shared';

export async function ratingsRoutes(app: FastifyInstance) {
  const ratingsService = new RatingsService();

  /**
   * GET /api/v1/ratings
   * Get ratings with filters
   */
  app.get<{ Querystring: GetRatingsRequest }>(
    '/',
    {
      schema: {
        description: 'Get ratings with optional filters',
        tags: ['ratings'],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            contentId: { type: 'string', format: 'uuid' },
            minRating: { type: 'number', minimum: 0, maximum: 10 },
            maxRating: { type: 'number', minimum: 0, maximum: 10 },
            sortBy: { type: 'string', enum: ['created_at', 'rating'], default: 'created_at' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filters = getRatingsSchema.parse(request.query);

      const result = await ratingsService.getRatings(filters);

      return reply.send({
        success: true,
        data: result.items,
        meta: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    }
  );

  /**
   * GET /api/v1/ratings/my/:contentId
   * Get user's rating for specific content
   */
  app.get<{ Params: { contentId: string } }>(
    '/my/:contentId',
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get user's rating for specific content",
        tags: ['ratings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['contentId'],
          properties: {
            contentId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { contentId } = request.params as any;

      const rating = await ratingsService.getUserRating(userId, contentId);

      if (!rating) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Rating not found',
          },
        });
      }

      return reply.send({
        success: true,
        data: rating,
      });
    }
  );

  /**
   * POST /api/v1/ratings
   * Create a new rating
   */
  app.post<{ Body: CreateRatingRequest }>(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Create a new rating',
        tags: ['ratings'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['contentId', 'rating'],
          properties: {
            contentId: { type: 'string', format: 'uuid' },
            rating: { type: 'number', minimum: 0, maximum: 10 },
            review: { type: 'string', maxLength: 2000 },
            isPublic: { type: 'boolean', default: true },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateRatingRequest }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const validated = createRatingSchema.parse(request.body);

      const rating = await ratingsService.createRating(userId, validated);

      return reply.code(201).send({
        success: true,
        data: rating,
      });
    }
  );

  /**
   * PUT /api/v1/ratings/:id
   * Update a rating
   */
  app.put<{
    Params: { id: string };
    Body: UpdateRatingRequest;
  }>(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Update a rating',
        tags: ['ratings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            rating: { type: 'number', minimum: 0, maximum: 10 },
            review: { type: 'string', maxLength: 2000 },
            isPublic: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { id } = request.params as any;
      const validated = updateRatingSchema.parse(request.body);

      const rating = await ratingsService.updateRating(userId, id, validated);

      return reply.send({
        success: true,
        data: rating,
      });
    }
  );

  /**
   * DELETE /api/v1/ratings/:id
   * Delete a rating
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Delete a rating',
        tags: ['ratings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { id } = request.params as any;

      await ratingsService.deleteRating(userId, id);

      return reply.send({
        success: true,
        message: 'Rating deleted successfully',
      });
    }
  );
}
