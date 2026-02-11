/**
 * Recommendations API Endpoints
 */

import type {
  Recommendation,
  GetRecommendationsRequest,
  ContentCard,
  ContentType,
  ApiResponse,
} from '@watchagent/shared';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export const recommendationsApi = {
  async getPersonalizedRecommendations(
    params?: GetRecommendationsRequest
  ): Promise<Recommendation[]> {
    const response = await apiClient.get<ApiResponse<Recommendation[]>>(
      API_ENDPOINTS.recommendations.personalized,
      { params }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch recommendations');
  },

  async getSimilarContent(
    tmdbId: number,
    type: ContentType,
    limit: number = 10
  ): Promise<ContentCard[]> {
    const response = await apiClient.get<ApiResponse<ContentCard[]>>(
      API_ENDPOINTS.recommendations.similar(tmdbId),
      { params: { type, limit } }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch similar content');
  },

  async getTrendingRecommendations(
    type: ContentType = 'movie',
    timeWindow: 'day' | 'week' = 'week',
    limit: number = 20
  ): Promise<ContentCard[]> {
    const response = await apiClient.get<ApiResponse<ContentCard[]>>(
      API_ENDPOINTS.recommendations.trending,
      { params: { type, timeWindow, limit } }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch trending recommendations');
  },

  async refreshRecommendations(): Promise<Recommendation[]> {
    const response = await apiClient.post<ApiResponse<Recommendation[]>>(
      API_ENDPOINTS.recommendations.refresh
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to refresh recommendations');
  },

  async submitFeedback(data: {
    contentId?: string;
    tmdbId?: string;
    type?: ContentType;
    contentTitle: string;
    action: 'not_relevant' | 'keep' | 'watchlist' | 'watched';
    rating?: number;
  }): Promise<{
    success: boolean;
    preferencesUpdated: boolean;
    learnedInsightsUpdated: boolean;
    shouldRemoveFromUI: boolean;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      preferencesUpdated: boolean;
      learnedInsightsUpdated: boolean;
      shouldRemoveFromUI: boolean;
    }>(API_ENDPOINTS.recommendations.feedback, data);

    if (response.data.success) {
      return {
        success: true,
        preferencesUpdated: response.data.preferencesUpdated ?? false,
        learnedInsightsUpdated: response.data.learnedInsightsUpdated ?? false,
        shouldRemoveFromUI: response.data.shouldRemoveFromUI ?? false,
      };
    }

    throw new Error('Failed to submit feedback');
  },
};
