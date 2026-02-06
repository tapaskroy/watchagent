/**
 * WatchAgent API Client
 * Main entry point for all API interactions
 */

export { apiClient } from './client';
export { API_CONFIG, API_ENDPOINTS, TOKEN_KEYS } from './config';
export { tokenStorage } from './storage';

export { authApi } from './endpoints/auth';
export { contentApi } from './endpoints/content';
export { watchlistApi } from './endpoints/watchlist';
export { ratingsApi } from './endpoints/ratings';
export { recommendationsApi } from './endpoints/recommendations';
export { chatApi } from './endpoints/chat';
export { preferencesApi } from './endpoints/preferences';

export type { LoginResponse, RegisterResponse } from './endpoints/auth';
