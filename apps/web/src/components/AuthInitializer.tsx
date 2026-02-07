'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

/**
 * Component that initializes authentication state on app load
 * This restores the user session from localStorage if a valid token exists
 */
export function AuthInitializer() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state on mount
    initializeAuth();
  }, [initializeAuth]);

  return null;
}
