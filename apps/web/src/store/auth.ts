import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@watchagent/api-client';
import type { User } from '@watchagent/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),

      logout: async () => {
        try {
          await authApi.logout();
          set({
            user: null,
            isAuthenticated: false,
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      initializeAuth: () => {
        // Check if we have a valid access token
        const token = localStorage.getItem('watchagent_access_token');

        if (token) {
          try {
            // Decode JWT to get user info (without verification - just for display)
            const payload = JSON.parse(
              atob(token.split('.')[1])
            );

            // Check if token is expired
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp > now) {
              // Token is valid, restore user from payload
              const restoredUser: User = {
                id: payload.id,
                username: payload.username,
                email: payload.email,
                isActive: true,
                emailVerified: true,
                profileVisibility: 'public' as const,
                showWatchlist: true,
                showRatings: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              set({
                user: restoredUser,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            } else {
              // Token expired, clear it
              localStorage.removeItem('watchagent_access_token');
              localStorage.removeItem('watchagent_refresh_token');
            }
          } catch (error) {
            console.error('Error decoding token:', error);
            // Invalid token, clear it
            localStorage.removeItem('watchagent_access_token');
            localStorage.removeItem('watchagent_refresh_token');
          }
        }

        // No valid token found
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'watchagent-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
