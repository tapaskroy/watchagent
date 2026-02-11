import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { feedbackService } from './feedback.service';

const feedbackSchema = z.object({
  contentId: z.string().uuid().optional(),
  tmdbId: z.string().optional(),
  type: z.enum(['movie', 'tv']).optional(),
  contentTitle: z.string(),
  action: z.enum(['not_relevant', 'keep', 'watchlist', 'watched']),
  rating: z.number().min(1).max(5).optional(),
}).refine(
  (data) => data.contentId || (data.tmdbId && data.type),
  { message: 'Either contentId or both tmdbId and type must be provided' }
);

export async function handleRecommendationFeedback(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    console.log('\n========== FEEDBACK REQUEST BODY ==========');
    console.log(JSON.stringify(request.body, null, 2));
    console.log('==========================================\n');

    const validatedData = feedbackSchema.parse(request.body);

    // If tmdbId is provided, resolve to contentId
    let contentId = validatedData.contentId;
    if (!contentId && validatedData.tmdbId && validatedData.type) {
      contentId = await feedbackService.resolveContentId(
        validatedData.tmdbId,
        validatedData.type
      );
    }

    if (!contentId) {
      return reply.status(400).send({ error: 'Could not resolve content' });
    }

    // Process feedback and update user preferences
    const result = await feedbackService.processFeedback({
      userId,
      contentId,
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
    console.log('\n========== FEEDBACK ERROR ==========');
    console.log('Error:', error);
    if (error instanceof z.ZodError) {
      console.log('Validation errors:', JSON.stringify(error.errors, null, 2));
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.log('====================================\n');
    request.log.error({ error }, 'Error processing recommendation feedback');
    reply.status(500).send({ error: 'Failed to process feedback' });
  }
}
