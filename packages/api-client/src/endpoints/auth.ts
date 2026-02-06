/**
 * Authentication API Endpoints
 */

import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthTokens,
  ApiResponse,
} from '@watchagent/shared';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import { tokenStorage } from '../storage';

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RegisterResponse extends AuthTokens {
  user: User;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.auth.login,
      credentials
    );

    console.log('Auth API response:', response);
    console.log('Response data:', response.data);
    console.log('Response data.success:', response.data.success);
    console.log('Response data.data:', response.data.data);

    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken } = response.data.data;
      console.log('About to store tokens...');
      tokenStorage.setAccessToken(accessToken);
      tokenStorage.setRefreshToken(refreshToken);
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Login failed');
  },

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<ApiResponse<RegisterResponse>>(
      API_ENDPOINTS.auth.register,
      userData
    );

    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken } = response.data.data;
      tokenStorage.setAccessToken(accessToken);
      tokenStorage.setRefreshToken(refreshToken);
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Registration failed');
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await apiClient.post<ApiResponse<AuthTokens>>(
      API_ENDPOINTS.auth.refresh,
      { refreshToken }
    );

    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      tokenStorage.setAccessToken(accessToken);
      tokenStorage.setRefreshToken(newRefreshToken);
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Token refresh failed');
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.auth.logout);
    } finally {
      tokenStorage.clearTokens();
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(
      API_ENDPOINTS.auth.me
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch user');
  },

  isAuthenticated(): boolean {
    return tokenStorage.hasTokens();
  },
};
