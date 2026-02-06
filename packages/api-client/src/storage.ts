/**
 * Token Storage Helper
 * Manages access and refresh tokens in both cookies and localStorage
 * Uses cookies for server-side middleware access and localStorage as backup
 */

import { TOKEN_KEYS } from './config';

const isBrowser = typeof window !== 'undefined';

// Helper to set cookie
const setCookie = (name: string, value: string, days: number = 7) => {
  if (!isBrowser) return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

// Helper to get cookie
const getCookie = (name: string): string | null => {
  if (!isBrowser) return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// Helper to delete cookie
const deleteCookie = (name: string) => {
  if (!isBrowser) return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (!isBrowser) return null;
    // Try cookie first (for middleware compatibility), then localStorage
    return getCookie(TOKEN_KEYS.accessToken) || localStorage.getItem(TOKEN_KEYS.accessToken);
  },

  setAccessToken: (token: string): void => {
    if (!isBrowser) return;
    console.log('Setting access token:', token.substring(0, 20) + '...');
    // Store in both cookie (for middleware) and localStorage (for client-side)
    setCookie(TOKEN_KEYS.accessToken, token, 7); // 7 days
    localStorage.setItem(TOKEN_KEYS.accessToken, token);
    console.log('Cookie set, document.cookie:', document.cookie);
  },

  getRefreshToken: (): string | null => {
    if (!isBrowser) return null;
    // Try cookie first, then localStorage
    return getCookie(TOKEN_KEYS.refreshToken) || localStorage.getItem(TOKEN_KEYS.refreshToken);
  },

  setRefreshToken: (token: string): void => {
    if (!isBrowser) return;
    console.log('Setting refresh token:', token.substring(0, 20) + '...');
    // Store refresh token in both cookie and localStorage
    setCookie(TOKEN_KEYS.refreshToken, token, 30); // 30 days
    localStorage.setItem(TOKEN_KEYS.refreshToken, token);
    console.log('Refresh cookie set, document.cookie:', document.cookie);
  },

  clearTokens: (): void => {
    if (!isBrowser) return;
    // Clear both cookies and localStorage
    deleteCookie(TOKEN_KEYS.accessToken);
    deleteCookie(TOKEN_KEYS.refreshToken);
    localStorage.removeItem(TOKEN_KEYS.accessToken);
    localStorage.removeItem(TOKEN_KEYS.refreshToken);
  },

  hasTokens: (): boolean => {
    return !!(tokenStorage.getAccessToken() && tokenStorage.getRefreshToken());
  },
};
