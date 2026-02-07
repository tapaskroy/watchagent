import { useMutation } from '@tanstack/react-query';
import { authApi } from '@watchagent/api-client';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import type {
  LoginRequest,
  RegisterRequest,
} from '@watchagent/shared';

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, logout: logoutStore } = useAuthStore();

  // Note: API doesn't return user object, we'll decode from JWT
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data, variables) => {
      console.log('Login successful, data:', data);

      // Decode JWT to get user info
      try {
        const token = data.accessToken;
        const payload = JSON.parse(atob(token.split('.')[1]));

        const authenticatedUser = {
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

        console.log('Setting user:', authenticatedUser);
        setUser(authenticatedUser);
        console.log('Redirecting to home page...');
        router.push('/');
      } catch (error) {
        console.error('Error decoding token:', error);
        // Fallback to email-based user
        const fallbackUser = {
          id: 'user-id',
          username: variables.email.split('@')[0],
          email: variables.email,
          isActive: true,
          emailVerified: true,
          profileVisibility: 'public' as const,
          showWatchlist: true,
          showRatings: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUser(fallbackUser);
        router.push('/');
      }
    },
    onError: (error) => {
      console.error('Login mutation error:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: RegisterRequest) => authApi.register(userData),
    onSuccess: (data, variables) => {
      // Decode JWT to get user info
      try {
        const token = data.accessToken;
        const payload = JSON.parse(atob(token.split('.')[1]));

        const authenticatedUser = {
          id: payload.id,
          username: payload.username,
          email: payload.email,
          fullName: variables.fullName,
          isActive: true,
          emailVerified: true,
          profileVisibility: 'public' as const,
          showWatchlist: true,
          showRatings: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setUser(authenticatedUser);
        router.push('/');
      } catch (error) {
        console.error('Error decoding token:', error);
        // Fallback
        const fallbackUser = {
          id: 'user-id',
          username: variables.username,
          email: variables.email,
          fullName: variables.fullName,
          isActive: true,
          emailVerified: true,
          profileVisibility: 'public' as const,
          showWatchlist: true,
          showRatings: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUser(fallbackUser);
        router.push('/');
      }
    },
  });

  const login = async (credentials: LoginRequest) => {
    return loginMutation.mutateAsync(credentials);
  };

  const register = async (userData: RegisterRequest) => {
    return registerMutation.mutateAsync(userData);
  };

  const logout = async () => {
    await logoutStore();
    router.push('/login');
  };

  return {
    user,
    isAuthenticated,
    isLoading: false,
    login,
    register,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
}
