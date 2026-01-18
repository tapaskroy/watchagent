import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WatchlistService } from '../../services/watchlist/watchlist.service';
import {
  addToWatchlistSchema,
  updateWatchlistSchema,
  getWatchlistSchema,
  AddToWatchlistRequest,
  UpdateWatchlistRequest,
  GetWatchlistRequest,
} from '@watchagent/shared';

export async function watchlistRoutes(app: FastifyInstance) {
  const watchlistService = new WatchlistService();

  /**
   * GET /api/v1/watchlist
   * Get user's watchlist
   */
  app.get<{ Querystring: GetWatchlistRequest }>(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get user's watchlist",
        tags: ['watchlist'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['to_watch', 'watching', 'watched'] },
            sortBy: {
              type: 'string',
              enum: ['added_at', 'priority', 'title', 'rating'],
              default: 'added_at',
            },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const filters = getWatchlistSchema.parse(request.query);

      const result = await watchlistService.getUserWatchlist(userId, filters);

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
   * POST /api/v1/watchlist
   * Add item to watchlist
   */
  app.post<{ Body: AddToWatchlistRequest }>(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Add content to watchlist',
        tags: ['watchlist'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['contentId'],
          properties: {
            contentId: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['to_watch', 'watching', 'watched'],
              default: 'to_watch',
            },
            priority: { type: 'number', minimum: 0, default: 0 },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: AddToWatchlistRequest }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const validated = addToWatchlistSchema.parse(request.body);

      const item = await watchlistService.addToWatchlist(userId, validated);

      return reply.code(201).send({
        success: true,
        data: item,
      });
    }
  );

  /**
   * PUT /api/v1/watchlist/:id
   * Update watchlist item
   */
  app.put<{
    Params: { id: string };
    Body: UpdateWatchlistRequest;
  }>(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Update watchlist item',
        tags: ['watchlist'],
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
            status: { type: 'string', enum: ['to_watch', 'watching', 'watched'] },
            priority: { type: 'number', minimum: 0 },
            notes: { type: 'string', maxLength: 1000 },
            watchedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { id } = request.params as any;
      const validated = updateWatchlistSchema.parse(request.body);

      const item = await watchlistService.updateWatchlistItem(userId, id, validated);

      return reply.send({
        success: true,
        data: item,
      });
    }
  );

  /**
   * DELETE /api/v1/watchlist/:id
   * Remove item from watchlist
   */
  app.delete<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Remove item from watchlist',
        tags: ['watchlist'],
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

      await watchlistService.removeFromWatchlist(userId, id);

      return reply.send({
        success: true,
        message: 'Item removed from watchlist',
      });
    }
  );
}
