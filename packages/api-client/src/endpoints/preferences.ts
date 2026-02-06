/**
 * Preferences API Endpoints
 */

import type {
  UserProfile,
  UserPreferences,
  UpdatePreferencesRequest,
  ApiResponse,
} from '@watchagent/shared';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export const preferencesApi = {
  async getUserProfile(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>(
      API_ENDPOINTS.preferences.profile
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch user profile');
  },

  async updatePreferences(data: UpdatePreferencesRequest): Promise<UserPreferences> {
    const response = await apiClient.put<ApiResponse<UserPreferences>>(
      API_ENDPOINTS.preferences.update,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to update preferences');
  },
};
