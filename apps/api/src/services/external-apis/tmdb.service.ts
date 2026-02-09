import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';
import { env } from '../../config/env';
import { CacheService, cacheKeys } from '../../config/redis';
import { TMDB_API_URL, CACHE_TTL } from '@watchagent/shared';
import { logDebug } from '../../config/logger';

// Rate limiter: 40 requests per 10 seconds
const limiter = new Bottleneck({
  reservoir: 40,
  reservoirRefreshAmount: 40,
  reservoirRefreshInterval: 10 * 1000, // 10 seconds
  maxConcurrent: 5,
  minTime: 250, // 250ms between requests
});

export class TMDBService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: TMDB_API_URL,
      params: {
        api_key: env.externalApis.tmdbApiKey,
      },
    });
  }

  /**
   * Search for movies and TV shows
   */
  async search(query: string, type?: 'movie' | 'tv', page: number = 1) {
    const cacheKey = cacheKeys.apiCache('tmdb', `/search/${type || 'multi'}/${query}/${page}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB search cache hit', { query, type, page });
      return cached;
    }

    // Determine endpoint
    const endpoint = type ? `/search/${type}` : '/search/multi';

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(endpoint, {
        params: { query, page },
      })
    );

    // Cache result
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_HOT);

    return response.data;
  }

  /**
   * Get movie details
   */
  async getMovieDetails(movieId: string) {
    const cacheKey = cacheKeys.apiCache('tmdb', `/movie/${movieId}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB movie details cache hit', { movieId });
      return cached;
    }

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(`/movie/${movieId}`, {
        params: {
          append_to_response: 'credits,keywords,videos,similar,watch/providers',
        },
      })
    );

    // Cache result for 24 hours
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_WARM);

    return response.data;
  }

  /**
   * Get TV show details
   */
  async getTVDetails(tvId: string) {
    const cacheKey = cacheKeys.apiCache('tmdb', `/tv/${tvId}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB TV details cache hit', { tvId });
      return cached;
    }

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(`/tv/${tvId}`, {
        params: {
          append_to_response: 'credits,keywords,videos,similar,watch/providers',
        },
      })
    );

    // Cache result for 24 hours
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_WARM);

    return response.data;
  }

  /**
   * Get trending content
   */
  async getTrending(mediaType: 'movie' | 'tv' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week') {
    const cacheKey = cacheKeys.apiCache('tmdb', `/trending/${mediaType}/${timeWindow}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB trending cache hit', { mediaType, timeWindow });
      return cached;
    }

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(`/trending/${mediaType}/${timeWindow}`)
    );

    // Cache result for 1 hour
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_HOT);

    return response.data;
  }

  /**
   * Get popular content
   */
  async getPopular(type: 'movie' | 'tv', page: number = 1) {
    const cacheKey = cacheKeys.apiCache('tmdb', `/${type}/popular/${page}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB popular cache hit', { type, page });
      return cached;
    }

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(`/${type}/popular`, {
        params: { page },
      })
    );

    // Cache result for 1 hour
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_HOT);

    return response.data;
  }

  /**
   * Get top rated content
   */
  async getTopRated(type: 'movie' | 'tv', page: number = 1) {
    const cacheKey = cacheKeys.apiCache('tmdb', `/${type}/top_rated/${page}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB top rated cache hit', { type, page });
      return cached;
    }

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(`/${type}/top_rated`, {
        params: { page },
      })
    );

    // Cache result for 24 hours
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_WARM);

    return response.data;
  }

  /**
   * Discover content with filters
   */
  async discover(
    type: 'movie' | 'tv',
    filters: {
      genres?: number[];
      yearFrom?: number;
      yearTo?: number;
      ratingFrom?: number;
      ratingTo?: number;
      sortBy?: string;
      page?: number;
      language?: string;
    }
  ) {
    const cacheKey = cacheKeys.apiCache('tmdb', `/discover/${type}/${JSON.stringify(filters)}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB discover cache hit', { type, filters });
      return cached;
    }

    // Build query parameters
    const params: any = {
      page: filters.page || 1,
      sort_by: filters.sortBy || 'popularity.desc',
    };

    if (filters.genres && filters.genres.length > 0) {
      params.with_genres = filters.genres.join(',');
    }

    if (type === 'movie') {
      if (filters.yearFrom) params['primary_release_date.gte'] = `${filters.yearFrom}-01-01`;
      if (filters.yearTo) params['primary_release_date.lte'] = `${filters.yearTo}-12-31`;
    } else {
      if (filters.yearFrom) params['first_air_date.gte'] = `${filters.yearFrom}-01-01`;
      if (filters.yearTo) params['first_air_date.lte'] = `${filters.yearTo}-12-31`;
    }

    if (filters.ratingFrom) params['vote_average.gte'] = filters.ratingFrom;
    if (filters.ratingTo) params['vote_average.lte'] = filters.ratingTo;

    // Filter by original language (e.g., 'fr' for French)
    if (filters.language) params['with_original_language'] = filters.language;

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(`/discover/${type}`, { params })
    );

    // Cache result for 1 hour
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_HOT);

    return response.data;
  }

  /**
   * Get similar content
   */
  async getSimilar(type: 'movie' | 'tv', id: string, page: number = 1) {
    const cacheKey = cacheKeys.apiCache('tmdb', `/${type}/${id}/similar/${page}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB similar cache hit', { type, id, page });
      return cached;
    }

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(`/${type}/${id}/similar`, {
        params: { page },
      })
    );

    // Cache result for 24 hours
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_WARM);

    return response.data;
  }

  /**
   * Get recommendations for content
   */
  async getRecommendations(type: 'movie' | 'tv', id: string, page: number = 1) {
    const cacheKey = cacheKeys.apiCache('tmdb', `/${type}/${id}/recommendations/${page}`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      logDebug('TMDB recommendations cache hit', { type, id, page });
      return cached;
    }

    // Make API call with rate limiting
    const response = await limiter.schedule(() =>
      this.client.get(`/${type}/${id}/recommendations`, {
        params: { page },
      })
    );

    // Cache result for 24 hours
    await CacheService.set(cacheKey, response.data, CACHE_TTL.REDIS_WARM);

    return response.data;
  }

  /**
   * Get genre list
   */
  async getGenres(type: 'movie' | 'tv') {
    const cacheKey = cacheKeys.apiCache('tmdb', `/genre/${type}/list`);

    // Check cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Make API call with rate limiting
    const response = await limiter.schedule(() => this.client.get(`/genre/${type}/list`));

    // Cache result for 7 days (genres rarely change)
    await CacheService.set(cacheKey, response.data, CACHE_TTL.POSTGRES_API);

    return response.data;
  }
}
