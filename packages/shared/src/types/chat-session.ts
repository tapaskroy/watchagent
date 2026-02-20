/**
 * Chat session and interactive conversation types
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: 'refine' | 'new_search' | 'filter' | 'similarity' | 'general';
    affectedItems?: string[];
    filtersApplied?: AppliedFilters;
  };
}

export interface AppliedFilters {
  genres?: number[];
  excludeGenres?: number[];
  minRating?: number;
  maxRating?: number;
  yearAfter?: number;
  yearBefore?: number;
  contentType?: 'movie' | 'tv';
  runtimeMax?: number;
  runtimeMin?: number;
}

export interface CurrentResults {
  type: 'recommendations' | 'search' | 'browse';
  items: Array<{
    id: string;
    tmdbId: string;
    title: string;
  }>;
  filters: AppliedFilters;
  query: string | null;
}

export interface SessionContext {
  preferredGenres: number[];
  excludedGenres: number[];
  timeframe: string | null;
  ratingThreshold: number | null;
  contentType: 'movie' | 'tv' | 'both';
  mood: string | null;
}

export interface ChatSession {
  sessionId: string;
  userId: string;
  startedAt: Date;
  lastMessageAt: Date;
  expiresAt: Date;

  // Conversation history
  messages: ChatMessage[];

  // Current screen state
  currentResults: CurrentResults | null;

  // User intent tracking
  currentIntent: 'refine' | 'new_search' | 'filter' | 'general';

  // Accumulated context
  sessionContext: SessionContext;
}

export interface InteractiveChatRequest {
  userId: string;
  sessionId?: string;
  message: string;
  currentScreenState?: {
    visibleItems: Array<{
      id: string;
      tmdbId: string;
      title: string;
    }>;
    appliedFilters: AppliedFilters;
  };
}

export interface InteractiveChatResponse {
  sessionId: string;
  response: {
    message: string;
    action: {
      type: 'filter' | 'replace' | 'append' | 'remove' | 'none';
      items?: any[]; // ContentCard[] - will be defined based on actual content
      filters?: AppliedFilters;
    };
    suggestions?: string[];
  };
  conversationHistory: ChatMessage[];
}
