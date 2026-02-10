/**
 * Conversation memory and summary types
 */

export interface ConversationInsights {
  summary: string;
  keyPoints: string[];
  moodPreferences: string[];
  dislikes: string[];
  favoriteMovies?: string[];
  favoriteGenres?: string[];
  favoriteActors?: string[];
}

export interface OnboardingSummary {
  summary: string;
  keyPoints: string[];
  extractedAt: string;
}

export interface RecentConversationSummary {
  conversationId: string;
  summary: string;
  timestamp: string;
  context: Record<string, any>;
}

export interface ConversationSummary {
  onboardingConversation?: OnboardingSummary;
  recentConversations: RecentConversationSummary[];
  lastUpdated: string;
}

export interface ConversationMemory {
  onboardingSummary: string;
  onboardingKeyPoints: string[];
  recentConversationInsights: string[];
}

export interface RatingPatterns {
  genreAverages: Record<number, number>; // genreId -> avgRating
  ratingDistribution: Record<string, number>; // rating range -> count
  favoriteActorsAvgRating: Record<string, number>; // actor -> avgRating
  averageRating: number;
  qualityThreshold: number; // User's threshold for "good" content
  totalRatings: number;
  analyzedAt: string;
}

export interface RatingInsights {
  genrePreferences: Record<number, number>;
  averageRating: number;
  ratingDistribution: Record<string, number>;
  qualityThreshold: number;
}

export interface EnhancedUserContext {
  userProfile: {
    preferredGenres: number[];
    favoriteActors: string[];
    preferredLanguages: string[];
    contentTypes: ('movie' | 'tv')[];
    moodPreferences: string[];
    dislikes: string[];
  };
  conversationMemory: ConversationMemory;
  ratingInsights: RatingInsights;
  recentActivity: {
    watched: Array<{ title: string; rating: number; review?: string; watchedAt?: Date }>;
    watchlist: Array<{ title: string; notes?: string; priority?: number }>;
    watchlistCount: number;
    rejectedContent: Array<{ title: string; genres: string; year: string }>;
  };
  socialContext: {
    friendsWatching: string[];
    trendingInNetwork: string[];
  };
}
