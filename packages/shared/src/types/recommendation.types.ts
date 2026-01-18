import { z } from 'zod';
import { ContentCard } from './content.types';

// Recommendation algorithm type
export type RecommendationAlgorithm = 'llm' | 'collaborative' | 'content-based' | 'hybrid';

// Recommendation
export interface Recommendation {
  id: string;
  userId: string;
  contentId: string;
  score: number; // 0-1 confidence score
  reason: string; // LLM-generated explanation
  algorithm: RecommendationAlgorithm;
  metadata: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
  content: ContentCard;
}

// Get recommendations request
export interface GetRecommendationsRequest {
  refresh?: boolean; // Force regenerate recommendations
  algorithm?: RecommendationAlgorithm;
  limit?: number;
}

// Similar content request
export interface SimilarContentRequest {
  contentId: string;
  limit?: number;
}

// Recommendation context (for LLM)
export interface RecommendationContext {
  userProfile: {
    preferredGenres: number[];
    favoriteActors: string[];
    preferredLanguages: string[];
    contentTypes: ('movie' | 'tv')[];
  };
  recentActivity: {
    watched: Array<{
      title: string;
      rating: number;
      review?: string;
    }>;
    watchlist: string[];
  };
  socialContext: {
    friendsWatching: string[];
    trendingInNetwork: string[];
  };
}

// Zod validators
export const getRecommendationsSchema = z.object({
  refresh: z.boolean().optional().default(false),
  algorithm: z.enum(['llm', 'collaborative', 'content-based', 'hybrid']).optional(),
  limit: z.number().min(1).max(50).optional().default(20),
});

export const similarContentSchema = z.object({
  contentId: z.string().uuid(),
  limit: z.number().min(1).max(20).optional().default(10),
});
