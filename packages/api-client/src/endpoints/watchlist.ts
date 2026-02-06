/**
 * Watchlist API Endpoints
 */

import type {
  WatchlistItem,
  AddToWatchlistRequest,
  AddToWatchlistWithTMDBRequest,
  UpdateWatchlistRequest,
  GetWatchlistRequest,
  ApiResponse,
  PaginatedResponse,
} from '@watchagent/shared';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export const watchlistApi = {
  async getWatchlist(filters?: GetWatchlistRequest): Promise<PaginatedResponse<WatchlistItem>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<WatchlistItem>>>(
      API_ENDPOINTS.watchlist.list,
      { params: filters }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch watchlist');
  },

  async addToWatchlist(data: AddToWatchlistRequest): Promise<WatchlistItem> {
    const response = await apiClient.post<ApiResponse<WatchlistItem>>(
      API_ENDPOINTS.watchlist.add,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to add to watchlist');
  },

  async addToWatchlistFromTMDB(data: AddToWatchlistWithTMDBRequest): Promise<WatchlistItem> {
    const response = await apiClient.post<ApiResponse<WatchlistItem>>(
      API_ENDPOINTS.watchlist.addFromTMDB,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to add to watchlist');
  },

  async updateWatchlistItem(id: string, data: UpdateWatchlistRequest): Promise<WatchlistItem> {
    const response = await apiClient.patch<ApiResponse<WatchlistItem>>(
      API_ENDPOINTS.watchlist.update(id),
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to update watchlist item');
  },

  async removeFromWatchlist(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(
      API_ENDPOINTS.watchlist.delete(id)
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to remove from watchlist');
    }
  },

  async checkWatchlistStatus(tmdbId: string): Promise<{ inWatchlist: boolean; itemId?: string }> {
    const response = await apiClient.get<ApiResponse<{ inWatchlist: boolean; itemId?: string }>>(
      API_ENDPOINTS.watchlist.check(tmdbId)
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to check watchlist status');
  },
};
