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

  // Note: API doesn't return user object, we'll decode from JWT or skip for now
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data, variables) => {
      console.log('Login successful, data:', data);
      // API only returns tokens, not user object
      // For now, create a minimal user object from the login email
      const mockUser = {
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
      console.log('Setting user:', mockUser);
      setUser(mockUser);
      console.log('Redirecting to home page...');
      router.push('/');
    },
    onError: (error) => {
      console.error('Login mutation error:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: RegisterRequest) => authApi.register(userData),
    onSuccess: (_data, variables) => {
      // API only returns tokens, not user object
      const mockUser = {
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
      setUser(mockUser);
      router.push('/');
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
