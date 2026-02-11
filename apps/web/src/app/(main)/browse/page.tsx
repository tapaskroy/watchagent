'use client';

import { useState } from 'react';
import { ContentCardWithFeedback, Loading, Toast } from '@watchagent/ui';
import { useTrending, usePopular } from '@/hooks/useContent';
import { useRouter } from 'next/navigation';
import type { ContentCard as ContentCardType } from '@watchagent/shared';
import { useQueryClient } from '@tanstack/react-query';

export default function BrowsePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: trendingMovies, isLoading: loadingTrending } = useTrending('movie');
  const { data: popularMovies, isLoading: loadingPopular } = usePopular('movie');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  const handleRemove = async (content: ContentCardType, reason: 'not_relevant' | 'watched', rating?: number) => {
    try {
      const { recommendationsApi } = await import('@watchagent/api-client');
      await recommendationsApi.submitFeedback({
        tmdbId: content.tmdbId,
        type: content.type,
        contentTitle: content.title,
        action: reason,
        rating,
      });

      // Remove from UI by updating the query cache
      queryClient.setQueryData(['trending', 'movie'], (old: any) => {
        if (!old) return old;
        return old.filter((item: any) => item.tmdbId !== content.tmdbId);
      });

      queryClient.setQueryData(['popular', 'movie'], (old: any) => {
        if (!old) return old;
        return old.filter((item: any) => item.tmdbId !== content.tmdbId);
      });

      // Invalidate to trigger re-render
      queryClient.invalidateQueries({ queryKey: ['trending'], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['popular'], refetchType: 'none' });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setToast({ message: 'Failed to submit feedback', type: 'error' });
    }
  };

  const handleKeep = async (content: ContentCardType, action: 'keep' | 'watchlist') => {
    try {
      const { recommendationsApi } = await import('@watchagent/api-client');
      await recommendationsApi.submitFeedback({
        tmdbId: content.tmdbId,
        type: content.type,
        contentTitle: content.title,
        action,
      });

      if (action === 'watchlist') {
        setToast({ message: `Added "${content.title}" to your watchlist`, type: 'success' });
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setToast({ message: 'Failed to submit feedback', type: 'error' });
    }
  };

  const isLoading = loadingTrending || loadingPopular;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 md:px-8 pt-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
          Browse
        </h1>
        <p className="text-text-secondary mb-8">
          Help us learn your taste by rating content you like or dislike
        </p>

        {/* Trending Movies */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Trending Now
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.isArray(trendingMovies) && trendingMovies.slice(0, 12).map((movie) => (
              <ContentCardWithFeedback
                key={movie.tmdbId}
                content={movie}
                onSelect={handleContentSelect}
                onRemove={handleRemove}
                onKeep={handleKeep}
              />
            ))}
          </div>
        </section>

        {/* Popular Movies */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Popular Movies
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.isArray(popularMovies) && popularMovies.slice(0, 12).map((movie) => (
              <ContentCardWithFeedback
                key={movie.tmdbId}
                content={movie}
                onSelect={handleContentSelect}
                onRemove={handleRemove}
                onKeep={handleKeep}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
