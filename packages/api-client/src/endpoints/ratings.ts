/**
 * Ratings API Endpoints
 */

import type {
  Rating,
  CreateRatingRequest,
  UpdateRatingRequest,
  GetRatingsRequest,
  ApiResponse,
  PaginatedResponse,
} from '@watchagent/shared';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export const ratingsApi = {
  async getRatings(filters?: GetRatingsRequest): Promise<PaginatedResponse<Rating>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Rating>>>(
      API_ENDPOINTS.ratings.list,
      { params: filters }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch ratings');
  },

  async getRatingsByContent(contentId: number): Promise<PaginatedResponse<Rating>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Rating>>>(
      API_ENDPOINTS.ratings.getByContent(contentId)
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch ratings');
  },

  async getMyRating(contentId: number): Promise<Rating | null> {
    try {
      const response = await apiClient.get<ApiResponse<Rating>>(
        API_ENDPOINTS.ratings.myRating(contentId)
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createRating(data: CreateRatingRequest): Promise<Rating> {
    const response = await apiClient.post<ApiResponse<Rating>>(
      API_ENDPOINTS.ratings.create,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to create rating');
  },

  async updateRating(id: number, data: UpdateRatingRequest): Promise<Rating> {
    const response = await apiClient.patch<ApiResponse<Rating>>(
      API_ENDPOINTS.ratings.update(id),
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to update rating');
  },

  async deleteRating(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(
      API_ENDPOINTS.ratings.delete(id)
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete rating');
    }
  },
};
