import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { feedbackService } from './feedback.service';

const feedbackSchema = z.object({
  contentId: z.string().uuid(),
  contentTitle: z.string(),
  action: z.enum(['not_relevant', 'keep', 'watchlist', 'watched']),
  rating: z.number().min(1).max(5).optional(),
});

export async function handleRecommendationFeedback(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const validatedData = feedbackSchema.parse(request.body);

    // Process feedback and update user preferences
    const result = await feedbackService.processFeedback({
      userId,
      contentId: validatedData.contentId,
      contentTitle: validatedData.contentTitle,
      action: validatedData.action,
      rating: validatedData.rating,
    });

    reply.send({
      success: result.success,
      message: 'Feedback processed successfully',
      preferencesUpdated: result.preferencesUpdated,
      learnedInsightsUpdated: result.learnedInsightsUpdated,
      shouldRemoveFromUI: result.shouldRemoveFromUI,
    });
  } catch (error) {
    request.log.error({ error }, 'Error processing recommendation feedback');
    reply.status(500).send({ error: 'Failed to process feedback' });
  }
}
