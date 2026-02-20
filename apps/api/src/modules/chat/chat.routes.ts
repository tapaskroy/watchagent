import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '../../services/chat/chat.service';
import { chatSessionService } from '../../services/chat/chat-session.service';
import type { InteractiveChatRequest } from '@watchagent/shared';

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

  /**
   * POST /api/v1/chat/interactive
   * Interactive chat with session management
   */
  app.post<{
    Body: InteractiveChatRequest;
  }>(
    '/interactive',
    {
      preHandler: [app.authenticate],
      schema: {
        description: 'Send a message with session context and get interactive response',
        tags: ['chat'],
        body: {
          type: 'object',
          required: ['userId', 'message'],
          properties: {
            userId: { type: 'string' },
            sessionId: { type: 'string' },
            message: { type: 'string' },
            currentScreenState: {
              type: 'object',
              properties: {
                visibleItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      tmdbId: { type: 'string' },
                      title: { type: 'string' },
                    },
                  },
                },
                appliedFilters: { type: 'object' },
              },
            },
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
                  sessionId: { type: 'string' },
                  response: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      action: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          items: { type: 'array' },
                          filters: { type: 'object' },
                        },
                      },
                      suggestions: { type: 'array', items: { type: 'string' } },
                    },
                  },
                  conversationHistory: { type: 'array' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: InteractiveChatRequest }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { sessionId, message, currentScreenState } = request.body;

      try {
        // Get or create session
        let session;
        if (sessionId) {
          session = await chatSessionService.getSession(sessionId);
          if (!session) {
            return reply.status(404).send({
              success: false,
              error: 'Session not found or expired',
            });
          }
        } else {
          // Create new session
          session = await chatSessionService.createSession(userId);
        }

        // Add user message to session
        const userMessage = {
          role: 'user' as const,
          content: message,
          timestamp: new Date(),
        };

        await chatSessionService.addMessage(session.sessionId, userMessage);

        // Update current results if provided
        if (currentScreenState) {
          await chatSessionService.updateCurrentResults(session.sessionId, {
            type: 'search',
            items: currentScreenState.visibleItems,
            filters: currentScreenState.appliedFilters,
            query: message,
          });
        }

        // For Phase 1, just return a simple response acknowledging the message
        // Phase 2 will add intent classification and intelligent responses
        const assistantMessage = {
          role: 'assistant' as const,
          content: `I received your message: "${message}". Session-based chat is now active! (Phase 1 - basic session tracking)`,
          timestamp: new Date(),
        };

        await chatSessionService.addMessage(session.sessionId, assistantMessage);

        // Get updated session
        const updatedSession = await chatSessionService.getSession(session.sessionId);

        return reply.send({
          success: true,
          data: {
            sessionId: session.sessionId,
            response: {
              message: assistantMessage.content,
              action: {
                type: 'none',
                items: currentScreenState?.visibleItems || [],
                filters: currentScreenState?.appliedFilters || {},
              },
              suggestions: ['Tell me more', 'Show me something different', 'Filter by genre'],
            },
            conversationHistory: updatedSession?.messages || [],
          },
        });
      } catch (error) {
        console.error('Interactive chat error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to process interactive chat message',
        });
      }
    }
  );
}
