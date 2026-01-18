import { z } from 'zod';
import { ContentCard } from './content.types';

// Activity type
export type ActivityType = 'rating' | 'watchlist_add' | 'review' | 'follow';

// Activity
export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  contentId?: string;
  targetUserId?: string;
  metadata: {
    rating?: number;
    review?: string;
    watchlistStatus?: string;
    [key: string]: any;
  };
  createdAt: Date;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  content?: ContentCard;
  targetUser?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

// Follow
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

// Get activity feed request
export interface GetActivityFeedRequest {
  type?: ActivityType;
  page?: number;
  limit?: number;
}

// Get followers/following request
export interface GetFollowsRequest {
  userId: string;
  type: 'followers' | 'following';
  page?: number;
  limit?: number;
}

// Friend suggestion
export interface FriendSuggestion {
  user: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
  mutualFriends: number;
  tasteMatch: number; // 0-100 percentage
  reasons: string[];
}

// Zod validators
export const getActivityFeedSchema = z.object({
  type: z.enum(['rating', 'watchlist_add', 'review', 'follow']).optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export const getFollowsSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['followers', 'following']),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(50),
});

export const followUserSchema = z.object({
  userId: z.string().uuid(),
});
