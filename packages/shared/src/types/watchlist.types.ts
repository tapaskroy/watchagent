import { z } from 'zod';
import { ContentCard } from './content.types';

// Watchlist status
export type WatchlistStatus = 'to_watch' | 'watching' | 'watched';

// Watchlist item
export interface WatchlistItem {
  id: string;
  userId: string;
  contentId: string;
  status: WatchlistStatus;
  priority: number;
  notes?: string;
  addedAt: Date;
  updatedAt: Date;
  watchedAt?: Date;
  content: ContentCard;
}

// Add to watchlist request (with UUID)
export interface AddToWatchlistRequest {
  contentId: string;
  status?: WatchlistStatus;
  priority?: number;
  notes?: string;
}

// Add to watchlist with TMDB data (for direct addition from search)
export interface AddToWatchlistWithTMDBRequest {
  tmdbId: string | number;
  type: 'movie' | 'tv';
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  genres?: Array<{ id: number; name: string }>;
  rating?: number;
  status?: WatchlistStatus;
  priority?: number;
  notes?: string;
}

// Update watchlist item request
export interface UpdateWatchlistRequest {
  status?: WatchlistStatus;
  priority?: number;
  notes?: string;
  watchedAt?: Date;
}

// Get watchlist request
export interface GetWatchlistRequest {
  status?: WatchlistStatus;
  sortBy?: 'added_at' | 'priority' | 'title' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Zod validators
export const addToWatchlistSchema = z.object({
  contentId: z.string().uuid(),
  status: z.enum(['to_watch', 'watching', 'watched']).optional().default('to_watch'),
  priority: z.number().int().min(0).optional().default(0),
  notes: z.string().max(1000).optional(),
});

export const addToWatchlistWithTMDBSchema = z.object({
  tmdbId: z.union([z.string(), z.number()]),
  type: z.enum(['movie', 'tv']),
  title: z.string(),
  overview: z.string().optional(),
  posterPath: z.string().optional(),
  backdropPath: z.string().optional(),
  releaseDate: z.string().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  rating: z.number().optional(),
  status: z.enum(['to_watch', 'watching', 'watched']).optional().default('to_watch'),
  priority: z.number().int().min(0).optional().default(0),
  notes: z.string().max(1000).optional(),
});

export const updateWatchlistSchema = z.object({
  status: z.enum(['to_watch', 'watching', 'watched']).optional(),
  priority: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
  watchedAt: z.date().optional(),
});

export const getWatchlistSchema = z.object({
  status: z.enum(['to_watch', 'watching', 'watched']).optional(),
  sortBy: z.enum(['added_at', 'priority', 'title', 'rating']).optional().default('added_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});
