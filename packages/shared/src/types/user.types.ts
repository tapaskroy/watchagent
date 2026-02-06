import { z } from 'zod';

// User profile visibility options
export type ProfileVisibility = 'public' | 'friends_only' | 'private';

// User type
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  profileVisibility: ProfileVisibility;
  showWatchlist: boolean;
  showRatings: boolean;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Learned preferences from conversations
export interface LearnedPreferences {
  favoriteMovies?: string[];
  favoriteGenres?: string[];
  favoriteActors?: string[];
  dislikes?: string[];
  moodPreferences?: string[];
}

// User preferences
export interface UserPreferences {
  id: string;
  userId: string;
  preferredGenres: number[]; // TMDB genre IDs
  favoriteActors: string[];
  preferredLanguages: string[];
  contentTypes: ('movie' | 'tv')[];
  notificationSettings: NotificationSettings;
  viewingPreferencesText?: string; // Natural language description of viewing preferences
  learnedPreferences: LearnedPreferences; // Auto-learned from conversations
  createdAt: Date;
  updatedAt: Date;
}

// Notification settings
export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  newRecommendations: boolean;
  friendActivity: boolean;
  newFollowers: boolean;
  watchlistUpdates: boolean;
}

// Public user profile (safe for API responses)
export interface PublicUserProfile {
  id: string;
  username: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  createdAt: Date;
  stats: UserStats;
}

// User statistics
export interface UserStats {
  moviesWatched: number;
  tvShowsWatched: number;
  watchlistItems: number;
  followersCount: number;
  followingCount: number;
  averageRating: number;
}

// Liked content item
export interface LikedContent {
  id: string;
  tmdbId: string;
  type: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  releaseDate?: string;
  rating: number;
  userRating: number;
  ratedAt: Date;
}

// User profile with preferences and stats
export interface UserProfile {
  user: {
    id: string;
    username: string;
    email: string;
    fullName?: string;
    bio?: string;
    avatarUrl?: string;
  };
  preferences: UserPreferences;
  stats: {
    totalRatings: number;
    totalWatchlistItems: number;
    averageRating: number;
  };
  likedContent: LikedContent[];
}

// Authentication types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdatePreferencesRequest {
  preferredGenres?: number[];
  favoriteActors?: string[];
  preferredLanguages?: string[];
  contentTypes?: ('movie' | 'tv')[];
  notificationSettings?: Partial<NotificationSettings>;
  viewingPreferencesText?: string;
  learnedPreferences?: LearnedPreferences;
}

// Zod validators
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().max(100).optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  profileVisibility: z.enum(['public', 'friends_only', 'private']).optional(),
  showWatchlist: z.boolean().optional(),
  showRatings: z.boolean().optional(),
});

export const updatePreferencesSchema = z.object({
  preferredGenres: z.array(z.number()).optional(),
  favoriteActors: z.array(z.string()).optional(),
  preferredLanguages: z.array(z.string()).optional(),
  contentTypes: z.array(z.enum(['movie', 'tv'])).optional(),
  notificationSettings: z
    .object({
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      newRecommendations: z.boolean().optional(),
      friendActivity: z.boolean().optional(),
      newFollowers: z.boolean().optional(),
      watchlistUpdates: z.boolean().optional(),
    })
    .optional(),
  viewingPreferencesText: z.string().max(5000).optional(),
  learnedPreferences: z.object({
    favoriteMovies: z.array(z.string()).optional(),
    favoriteGenres: z.array(z.string()).optional(),
    favoriteActors: z.array(z.string()).optional(),
    dislikes: z.array(z.string()).optional(),
    moodPreferences: z.array(z.string()).optional(),
  }).optional(),
});
