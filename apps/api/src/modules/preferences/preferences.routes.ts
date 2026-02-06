import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PreferencesService } from '../../services/preferences/preferences.service';
import {
  updatePreferencesSchema,
  UpdatePreferencesRequest,
} from '@watchagent/shared';

export async function preferencesRoutes(app: FastifyInstance) {
  const preferencesService = new PreferencesService();

  /**
   * GET /api/v1/preferences/profile
   * Get user profile with preferences and stats
   */
  app.get(
    '/profile',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get user profile with preferences and stats',
        tags: ['preferences'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      const profile = await preferencesService.getUserProfile(userId);

      return reply.send({
        success: true,
        data: profile,
      });
    }
  );

  /**
   * PUT /api/v1/preferences
   * Update user preferences
   */
  app.put<{ Body: UpdatePreferencesRequest }>(
    '/',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Update user preferences',
        tags: ['preferences'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            preferredGenres: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                },
              },
            },
            favoriteActors: { type: 'array', items: { type: 'string' } },
            preferredLanguages: { type: 'array', items: { type: 'string' } },
            contentTypes: { type: 'array', items: { type: 'string', enum: ['movie', 'tv'] } },
            notificationSettings: { type: 'object' },
            viewingPreferencesText: { type: 'string', maxLength: 5000 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: UpdatePreferencesRequest }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const validated = updatePreferencesSchema.parse(request.body);

      const preferences = await preferencesService.updatePreferences(userId, validated);

      return reply.send({
        success: true,
        data: preferences,
      });
    }
  );
}
