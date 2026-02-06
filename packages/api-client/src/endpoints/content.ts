/**
 * Content API Endpoints
 */

import type {
  Content,
  ContentCard,
  ContentSearchFilters,
  ContentType,
  ApiResponse,
  PaginatedResponse,
} from '@watchagent/shared';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export const contentApi = {
  async search(filters: ContentSearchFilters): Promise<PaginatedResponse<ContentCard>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<ContentCard>>>(
      API_ENDPOINTS.content.search,
      { params: filters }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Search failed');
  },

  async getDetails(tmdbId: number, type: ContentType): Promise<Content> {
    const response = await apiClient.get<ApiResponse<Content>>(
      API_ENDPOINTS.content.details(tmdbId),
      { params: { type } }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch content details');
  },

  async getTrending(
    type: ContentType = 'movie',
    timeWindow: 'day' | 'week' = 'week',
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<ContentCard>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<ContentCard>>>(
      API_ENDPOINTS.content.trending,
      { params: { type, timeWindow, page, limit } }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch trending content');
  },

  async getPopular(
    type: ContentType = 'movie',
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<ContentCard>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<ContentCard>>>(
      API_ENDPOINTS.content.popular,
      { params: { type, page, limit } }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch popular content');
  },

  async discover(filters: ContentSearchFilters): Promise<PaginatedResponse<ContentCard>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<ContentCard>>>(
      API_ENDPOINTS.content.discover,
      { params: filters }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Discovery failed');
  },
};
