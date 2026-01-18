import Redis from 'ioredis';
import { env } from './env';

// Create Redis client
export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  db: env.redis.db,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Redis event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error);
});

// Cache utilities
export class CacheService {
  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Set cached value with TTL
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  }

  /**
   * Delete cached value
   */
  static async del(key: string): Promise<void> {
    await redis.del(key);
  }

  /**
   * Delete multiple keys by pattern
   */
  static async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  }

  /**
   * Increment counter
   */
  static async incr(key: string): Promise<number> {
    return await redis.incr(key);
  }

  /**
   * Set expiration on key
   */
  static async expire(key: string, ttl: number): Promise<void> {
    await redis.expire(key, ttl);
  }
}

// Cache key builders
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userPreferences: (userId: string) => `user:${userId}:preferences`,
  content: (tmdbId: string) => `content:${tmdbId}`,
  recommendations: (userId: string) => `recommendations:${userId}`,
  watchlist: (userId: string) => `watchlist:${userId}`,
  ratings: (userId: string) => `ratings:${userId}`,
  activityFeed: (userId: string) => `feed:${userId}`,
  session: (token: string) => `session:${token}`,
  apiCache: (source: string, endpoint: string) => `api:${source}:${endpoint}`,
};
