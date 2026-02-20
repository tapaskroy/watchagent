import { redis } from '../../config/redis';
import { logInfo, logError } from '../../config/logger';
import {
  ChatSession,
  ChatMessage,
  SessionContext,
  CurrentResults,
} from '@watchagent/shared';
import { randomUUID } from 'crypto';

const SESSION_TTL = 3600; // 1 hour in seconds
const SESSION_KEY_PREFIX = 'chat:session:';
const USER_SESSIONS_PREFIX = 'chat:user:';

export class ChatSessionService {
  /**
   * Create a new chat session
   */
  async createSession(userId: string): Promise<ChatSession> {
    const sessionId = randomUUID();
    const now = new Date();

    const session: ChatSession = {
      sessionId,
      userId,
      startedAt: now,
      lastMessageAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL * 1000),
      messages: [],
      currentResults: null,
      currentIntent: 'general',
      sessionContext: {
        preferredGenres: [],
        excludedGenres: [],
        timeframe: null,
        ratingThreshold: null,
        contentType: 'both',
        mood: null,
      },
    };

    await this.saveSession(session);

    // Track this session for the user
    await redis.sadd(`${USER_SESSIONS_PREFIX}${userId}:active`, sessionId);

    logInfo('Created new chat session', { userId, sessionId });

    return session;
  }

  /**
   * Get an existing session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const key = `${SESSION_KEY_PREFIX}${sessionId}`;
      const data = await redis.get(key);

      if (!data) {
        return null;
      }

      const session = JSON.parse(data) as ChatSession;

      // Convert date strings back to Date objects
      session.startedAt = new Date(session.startedAt);
      session.lastMessageAt = new Date(session.lastMessageAt);
      session.expiresAt = new Date(session.expiresAt);
      session.messages = session.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      return session;
    } catch (error) {
      logError(error as Error, { sessionId, service: 'ChatSessionService.getSession' });
      return null;
    }
  }

  /**
   * Save or update a session
   */
  async saveSession(session: ChatSession): Promise<void> {
    try {
      const key = `${SESSION_KEY_PREFIX}${session.sessionId}`;
      await redis.setex(key, SESSION_TTL, JSON.stringify(session));

      logInfo('Saved chat session', { sessionId: session.sessionId });
    } catch (error) {
      logError(error as Error, { sessionId: session.sessionId, service: 'ChatSessionService.saveSession' });
      throw error;
    }
  }

  /**
   * Add a message to the session
   */
  async addMessage(
    sessionId: string,
    message: ChatMessage
  ): Promise<ChatSession | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      logError(new Error('Session not found'), { sessionId });
      return null;
    }

    session.messages.push(message);
    session.lastMessageAt = new Date();

    await this.saveSession(session);

    return session;
  }

  /**
   * Update session context
   */
  async updateContext(
    sessionId: string,
    contextUpdates: Partial<SessionContext>
  ): Promise<ChatSession | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    session.sessionContext = {
      ...session.sessionContext,
      ...contextUpdates,
    };

    await this.saveSession(session);

    return session;
  }

  /**
   * Update current results on screen
   */
  async updateCurrentResults(
    sessionId: string,
    results: CurrentResults
  ): Promise<ChatSession | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    session.currentResults = results;

    await this.saveSession(session);

    return session;
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const sessions = await redis.smembers(`${USER_SESSIONS_PREFIX}${userId}:active`);
      return sessions;
    } catch (error) {
      logError(error as Error, { userId, service: 'ChatSessionService.getUserSessions' });
      return [];
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);

      if (session) {
        // Remove from user's active sessions
        await redis.srem(`${USER_SESSIONS_PREFIX}${session.userId}:active`, sessionId);
      }

      // Delete session data
      await redis.del(`${SESSION_KEY_PREFIX}${sessionId}`);

      logInfo('Deleted chat session', { sessionId });
    } catch (error) {
      logError(error as Error, { sessionId, service: 'ChatSessionService.deleteSession' });
    }
  }

  /**
   * Cleanup expired sessions for a user
   */
  async cleanupExpiredSessions(userId: string): Promise<void> {
    const sessionIds = await this.getUserSessions(userId);

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);

      if (!session || session.expiresAt < new Date()) {
        await this.deleteSession(sessionId);
      }
    }
  }
}

export const chatSessionService = new ChatSessionService();
