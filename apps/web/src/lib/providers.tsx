'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthInitializer } from '@/components/AuthInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  // Read Google Client ID from runtime config (injected by entrypoint.sh → env.js)
  // so the same Docker image works across environments without a rebuild.
  const googleClientId = typeof window !== 'undefined'
    ? ((window as Window & { __NEXT_ENV__?: { NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string } })
        .__NEXT_ENV__?.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '')
    : (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '');

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
        {children}
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
