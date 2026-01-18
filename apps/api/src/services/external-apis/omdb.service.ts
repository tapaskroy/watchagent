import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';
import { env } from '../../config/env';
import { CacheService, cacheKeys } from '../../config/redis';
import { OMDB_API_URL, CACHE_TTL } from '@watchagent/shared';
import { logError, logDebug } from '../../config/logger';

// Rate limiter: 1000 requests per day = ~41 per hour = ~0.7 per minute
const limiter = new Bottleneck({
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
  maxConcurrent: 2,
  minTime: 1000, // 1 second between requests
});

export class OMDBService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: OMDB_API_URL,
      params: {
        apikey: env.externalApis.omdbApiKey,
      },
    });
  }

  /**
   * Get movie/show details by IMDb ID
   */
  async getByImdbId(imdbId: string) {
    const cacheKey = cacheKeys.apiCache('omdb', `/i/${imdbId}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('OMDB cache hit', { imdbId });
      return cached;
    }

    try {
      // Make API call with rate limiting
      const response = await limiter.schedule(() =>
        this.client.get('/', {
          params: {
            i: imdbId,
            plot: 'full',
          },
        })
      );

      // Check if response is valid
      if (response.data.Response === 'False') {
        logError(new Error('OMDB API returned error'), {
          imdbId,
          error: response.data.Error,
        });
        return null;
      }

      // Cache result for 7 days
      await CacheService.set(cacheKey, response.data, CACHE_TTL.POSTGRES_API);

      return response.data;
    } catch (error) {
      logError(error as Error, { imdbId, service: 'OMDB' });
      return null;
    }
  }

  /**
   * Get movie/show details by title
   */
  async getByTitle(title: string, year?: number, type?: 'movie' | 'series') {
    const cacheKey = cacheKeys.apiCache('omdb', `/t/${title}/${year}/${type}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('OMDB cache hit', { title, year, type });
      return cached;
    }

    try {
      // Build params
      const params: any = {
        t: title,
        plot: 'full',
      };

      if (year) params.y = year;
      if (type) params.type = type;

      // Make API call with rate limiting
      const response = await limiter.schedule(() => this.client.get('/', { params }));

      // Check if response is valid
      if (response.data.Response === 'False') {
        logError(new Error('OMDB API returned error'), {
          title,
          year,
          type,
          error: response.data.Error,
        });
        return null;
      }

      // Cache result for 7 days
      await CacheService.set(cacheKey, response.data, CACHE_TTL.POSTGRES_API);

      return response.data;
    } catch (error) {
      logError(error as Error, { title, year, type, service: 'OMDB' });
      return null;
    }
  }

  /**
   * Search for movies/shows
   */
  async search(query: string, year?: number, type?: 'movie' | 'series', page: number = 1) {
    const cacheKey = cacheKeys.apiCache('omdb', `/s/${query}/${year}/${type}/${page}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('OMDB search cache hit', { query, year, type, page });
      return cached;
    }

    try {
      // Build params
      const params: any = {
        s: query,
        page,
      };

      if (year) params.y = year;
      if (type) params.type = type;

      // Make API call with rate limiting
      const response = await limiter.schedule(() => this.client.get('/', { params }));

      // Check if response is valid
      if (response.data.Response === 'False') {
        return { Search: [], totalResults: '0' };
      }

      // Cache result for 1 hour
      await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_HOT);

      return response.data;
    } catch (error) {
      logError(error as Error, { query, year, type, page, service: 'OMDB' });
      return { Search: [], totalResults: '0' };
    }
  }
}
