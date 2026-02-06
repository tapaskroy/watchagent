/**
 * Chat API Endpoints
 */

import type { ApiResponse } from '@watchagent/shared';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  conversationId: string;
  messages: ChatMessage[];
  isOnboarding: boolean;
  onboardingCompleted: boolean;
  context: any;
}

export interface InitOnboardingResponse {
  message: string;
  conversationId: string;
}

export interface SendMessageResponse {
  message: string;
  onboardingCompleted: boolean;
  isSearch?: boolean;
  searchResults?: any[];
}

export const chatApi = {
  async getConversation(): Promise<Conversation> {
    const response = await apiClient.get<ApiResponse<Conversation>>(
      API_ENDPOINTS.chat.conversation
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to get conversation');
  },

  async initOnboarding(): Promise<InitOnboardingResponse> {
    const response = await apiClient.post<ApiResponse<InitOnboardingResponse>>(
      API_ENDPOINTS.chat.initOnboarding
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to initialize onboarding');
  },

  async sendMessage(conversationId: string, message: string): Promise<SendMessageResponse> {
    const response = await apiClient.post<ApiResponse<SendMessageResponse>>(
      API_ENDPOINTS.chat.message,
      { conversationId, message }
    );

    console.log('[API Client] Raw response:', response.data);
    console.log('[API Client] Response data:', response.data.data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || 'Failed to send message');
  },
};
