'use client';

import { useState } from 'react';
import { ContentCard, Loading, Toast } from '@watchagent/ui';
import { useTrending, usePopular } from '@/hooks/useContent';
import { useRouter } from 'next/navigation';
import type { ContentCard as ContentCardType } from '@watchagent/shared';
import { useWatchlist } from '@/hooks/useWatchlist';

export default function BrowsePage() {
  const router = useRouter();
  const { data: trendingMovies, isLoading: loadingTrending } = useTrending('movie');
  const { data: popularMovies, isLoading: loadingPopular } = usePopular('movie');
  const { addToWatchlistMutation } = useWatchlist();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  const handleWatchlist = (content: ContentCardType) => {
    addToWatchlistMutation.mutate(
      {
        tmdbId: content.tmdbId,
        type: content.type,
        title: content.title,
        posterPath: content.posterPath,
        releaseDate: content.releaseDate,
        genres: content.genres,
        rating: content.tmdbRating,
        status: 'to_watch',
      },
      {
        onSuccess: () => {
          setToast({ message: `Added "${content.title}" to your watchlist`, type: 'success' });
        },
        onError: (error: any) => {
          console.error('Failed to add to watchlist:', error);
          setToast({
            message: `Failed to add "${content.title}": ${error.message || 'Unknown error'}`,
            type: 'error'
          });
        },
      }
    );
  };

  const handleLove = (content: ContentCardType) => {
    // TODO: Call preference learning API
    console.log('Loved:', content.title);
    setToast({ message: `Great! We'll recommend more like "${content.title}"`, type: 'success' });
  };

  const handleHate = (content: ContentCardType) => {
    // TODO: Call preference learning API
    console.log('Passed on:', content.title);
    setToast({ message: `Got it! We'll show you less content like this`, type: 'info' });
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
              <ContentCard
                key={movie.tmdbId}
                content={movie}
                onSelect={handleContentSelect}
                showActions={true}
                onWatchlist={handleWatchlist}
                onLove={handleLove}
                onHate={handleHate}
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
              <ContentCard
                key={movie.tmdbId}
                content={movie}
                onSelect={handleContentSelect}
                showActions={true}
                onWatchlist={handleWatchlist}
                onLove={handleLove}
                onHate={handleHate}
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
