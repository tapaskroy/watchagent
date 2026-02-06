import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '../../services/chat/chat.service';

const chatService = new ChatService();

export async function chatRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/chat/conversation
   * Get or create conversation for current user
   */
  app.get(
    '/conversation',
    {
      preHandler: [app.authenticate],
      schema: {
        description: 'Get or create a conversation for the current user',
        tags: ['chat'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  conversationId: { type: 'string' },
                  messages: { type: 'array' },
                  isOnboarding: { type: 'boolean' },
                  onboardingCompleted: { type: 'boolean' },
                  context: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).id;

      const conversation = await chatService.getOrCreateConversation(userId);

      return reply.send({
        success: true,
        data: {
          conversationId: conversation.id,
          messages: conversation.messages,
          isOnboarding: conversation.isOnboarding,
          onboardingCompleted: conversation.onboardingCompleted,
          context: conversation.context,
        },
      });
    }
  );

  /**
   * POST /api/v1/chat/init-onboarding
   * Initialize onboarding with LLM-generated questions
   */
  app.post(
    '/init-onboarding',
    {
      preHandler: [app.authenticate],
      schema: {
        description: 'Initialize onboarding conversation with AI-generated questions',
        tags: ['chat'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  conversationId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).id;

      const conversation = await chatService.getOrCreateConversation(userId);

      // Only generate questions if this is a new onboarding conversation
      if (conversation.isOnboarding && (conversation.messages as any[]).length === 0) {
        const questions = await chatService.generateOnboardingQuestions(userId);

        return reply.send({
          success: true,
          data: {
            message: questions,
            conversationId: conversation.id,
          },
        });
      }

      // If already has messages, return the last assistant message
      const messages = conversation.messages as any[];
      const lastAssistantMessage = messages
        .filter((m) => m.role === 'assistant')
        .pop();

      return reply.send({
        success: true,
        data: {
          message: lastAssistantMessage?.content || 'Hello! How can I help you find something to watch?',
          conversationId: conversation.id,
        },
      });
    }
  );

  /**
   * POST /api/v1/chat/message
   * Send a message and get AI response
   */
  app.post<{
    Body: {
      conversationId: string;
      message: string;
    };
  }>(
    '/message',
    {
      preHandler: [app.authenticate],
      schema: {
        description: 'Send a message and get AI response',
        tags: ['chat'],
        body: {
          type: 'object',
          required: ['conversationId', 'message'],
          properties: {
            conversationId: { type: 'string' },
            message: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  onboardingCompleted: { type: 'boolean' },
                  isSearch: { type: 'boolean' },
                  searchResults: { type: 'array' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { conversationId: string; message: string } }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { conversationId, message } = request.body;

      const response = await chatService.processMessage(userId, message, conversationId);

      // Get updated conversation to check onboarding status
      const conversation = await chatService.getOrCreateConversation(userId);

      const responseData = {
        success: true,
        data: {
          message: response.message,
          onboardingCompleted: conversation.onboardingCompleted,
          isSearch: response.isSearch,
          searchResults: response.searchResults || [],
        },
      };

      // Log the response for debugging
      console.log('Sending chat response:', {
        isSearch: response.isSearch,
        searchResultsCount: response.searchResults?.length || 0,
        allResults: response.searchResults?.map(r => ({
          id: r.id,
          title: r.title,
          tmdbId: r.tmdbId,
          type: r.type,
        }))
      });

      return reply.send(responseData);
    }
  );
}
