export * from './genres';

// API Configuration
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Token expiration
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  REDIS_HOT: 3600, // 1 hour
  REDIS_WARM: 86400, // 24 hours
  POSTGRES_API: 604800, // 7 days
  RECOMMENDATIONS: 86400, // 24 hours
} as const;

// Rate limits
export const RATE_LIMITS = {
  AUTH: {
    points: 5,
    duration: 900, // 15 minutes
  },
  API: {
    points: 100,
    duration: 60, // 1 minute
  },
  SEARCH: {
    points: 30,
    duration: 60, // 1 minute
  },
} as const;

// External API Configuration
export const TMDB_API_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
export const OMDB_API_URL = 'http://www.omdbapi.com';

// Image sizes
export const IMAGE_SIZES = {
  POSTER: {
    SMALL: 'w185',
    MEDIUM: 'w342',
    LARGE: 'w500',
    ORIGINAL: 'original',
  },
  BACKDROP: {
    SMALL: 'w300',
    MEDIUM: 'w780',
    LARGE: 'w1280',
    ORIGINAL: 'original',
  },
  PROFILE: {
    SMALL: 'w45',
    MEDIUM: 'w185',
    LARGE: 'h632',
    ORIGINAL: 'original',
  },
} as const;

// Recommendation settings
export const RECOMMENDATION_CONFIG = {
  LLM_MODEL: 'claude-sonnet-4-5-20251101',
  MAX_RECOMMENDATIONS: 20,
  CANDIDATE_POOL_SIZE: 500,
  REFRESH_INTERVAL_HOURS: 12,
} as const;

// WebSocket events
export const WS_EVENTS = {
  CONNECT: 'connection',
  DISCONNECT: 'disconnect',
  NEW_ACTIVITY: 'new_activity',
  NEW_FOLLOWER: 'new_follower',
  NEW_RECOMMENDATION: 'new_recommendation',
  WATCHLIST_UPDATE: 'watchlist_update',
} as const;
