import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, content } from '@watchagent/database';

export async function adminRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/admin/clear-content-cache
   * Clear all cached content to force refresh with new data
   * TEMPORARY ENDPOINT - Remove after use
   */
  app.post(
    '/clear-content-cache',
    {
      schema: {
        description: 'Clear all cached content',
        tags: ['admin'],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Delete all content from cache
        const result = await db.delete(content);

        return reply.send({
          success: true,
          message: 'Content cache cleared successfully',
          deletedCount: result.rowCount || 0,
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: {
            code: 'CACHE_CLEAR_FAILED',
            message: error instanceof Error ? error.message : 'Failed to clear cache',
          },
        });
      }
    }
  );
}
