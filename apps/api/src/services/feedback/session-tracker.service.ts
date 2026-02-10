import { EventEmitter } from 'events';

export interface FeedbackAction {
  userId: string;
  contentId: string;
  contentTitle: string;
  action: 'not_relevant' | 'keep' | 'watchlist' | 'watched';
  rating?: number;
  timestamp: Date;
  genres?: string;
  year?: string;
}

interface UserSession {
  userId: string;
  actions: FeedbackAction[];
  lastActivityTime: Date;
  timeoutId?: NodeJS.Timeout;
}

class SessionTrackerService extends EventEmitter {
  private sessions: Map<string, UserSession> = new Map();
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  trackAction(action: FeedbackAction) {
    const { userId } = action;
    let session = this.sessions.get(userId);

    if (!session) {
      session = {
        userId,
        actions: [],
        lastActivityTime: new Date(),
      };
      this.sessions.set(userId, session);
      console.log(`[SessionTracker] Created new session for user ${userId}`);
    }

    session.actions.push(action);
    session.lastActivityTime = new Date();

    console.log(`[SessionTracker] Action tracked for user ${userId}. Total actions: ${session.actions.length}`);

    // Clear existing timeout
    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
    }

    // Set new timeout for 5 minutes
    session.timeoutId = setTimeout(() => {
      this.processSession(userId);
    }, this.SESSION_TIMEOUT);
  }

  private processSession(userId: string) {
    const session = this.sessions.get(userId);

    if (!session || session.actions.length === 0) {
      return;
    }

    console.log(`[SessionTracker] Processing session for user ${userId} with ${session.actions.length} actions`);

    // Emit event for batch processing
    this.emit('sessionComplete', {
      userId,
      actions: session.actions,
    });

    // Clean up session
    this.sessions.delete(userId);
  }

  // For debugging
  getActiveSession(userId: string): UserSession | undefined {
    return this.sessions.get(userId);
  }
}

export const sessionTracker = new SessionTrackerService();
