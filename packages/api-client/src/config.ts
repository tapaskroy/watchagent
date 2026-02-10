/**
 * API Client Configuration
 * Base configuration for API communication
 */

export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

export const TOKEN_KEYS = {
  accessToken: 'watchagent_access_token',
  refreshToken: 'watchagent_refresh_token',
} as const;

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  content: {
    search: '/content/search',
    details: (tmdbId: number) => `/content/${tmdbId}`,
    trending: '/content/trending',
    popular: '/content/popular',
    discover: '/content/discover',
  },
  watchlist: {
    list: '/watchlist',
    add: '/watchlist',
    addFromTMDB: '/watchlist/from-tmdb',
    check: (tmdbId: string) => `/watchlist/check/${tmdbId}`,
    update: (id: string) => `/watchlist/${id}`,
    delete: (id: string) => `/watchlist/${id}`,
  },
  ratings: {
    list: '/ratings',
    getByContent: (contentId: number) => `/ratings/content/${contentId}`,
    myRating: (contentId: number) => `/ratings/my/${contentId}`,
    create: '/ratings',
    update: (id: number) => `/ratings/${id}`,
    delete: (id: number) => `/ratings/${id}`,
  },
  recommendations: {
    personalized: '/recommendations/personalized',
    similar: (tmdbId: number) => `/recommendations/similar/${tmdbId}`,
    trending: '/recommendations/trending',
    refresh: '/recommendations/refresh',
    feedback: '/recommendations/feedback',
  },
  chat: {
    conversation: '/chat/conversation',
    initOnboarding: '/chat/init-onboarding',
    message: '/chat/message',
  },
  preferences: {
    profile: '/preferences/profile',
    update: '/preferences',
  },
} as const;
