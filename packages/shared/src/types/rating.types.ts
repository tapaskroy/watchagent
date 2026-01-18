import { z } from 'zod';
import { ContentCard } from './content.types';

// Rating
export interface Rating {
  id: string;
  userId: string;
  contentId: string;
  rating: number; // 0-10
  review?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  content: ContentCard;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

// Create rating request
export interface CreateRatingRequest {
  contentId: string;
  rating: number;
  review?: string;
  isPublic?: boolean;
}

// Update rating request
export interface UpdateRatingRequest {
  rating?: number;
  review?: string;
  isPublic?: boolean;
}

// Get ratings request
export interface GetRatingsRequest {
  userId?: string;
  contentId?: string;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'created_at' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Zod validators
export const createRatingSchema = z.object({
  contentId: z.string().uuid(),
  rating: z.number().min(0).max(10),
  review: z.string().max(2000).optional(),
  isPublic: z.boolean().optional().default(true),
});

export const updateRatingSchema = z.object({
  rating: z.number().min(0).max(10).optional(),
  review: z.string().max(2000).optional(),
  isPublic: z.boolean().optional(),
});

export const getRatingsSchema = z.object({
  userId: z.string().uuid().optional(),
  contentId: z.string().uuid().optional(),
  minRating: z.number().min(0).max(10).optional(),
  maxRating: z.number().min(0).max(10).optional(),
  sortBy: z.enum(['created_at', 'rating']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});
