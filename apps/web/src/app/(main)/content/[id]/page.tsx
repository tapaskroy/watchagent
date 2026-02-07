'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Loading, Button, Grid, ContentCard } from '@watchagent/ui';
import { useContentDetails } from '@/hooks/useContent';
import { useSimilarContent } from '@/hooks/useRecommendations';
import { useAddToWatchlistFromTMDB, useWatchlistStatus, useRemoveFromWatchlist } from '@/hooks/useWatchlist';
import { useRouter } from 'next/navigation';
import type { ContentType, ContentCard as ContentCardType } from '@watchagent/shared';

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as ContentType) || 'movie';
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: content, isLoading } = useContentDetails(Number(params.id), type);
  const { data: similarContent } = useSimilarContent(Number(params.id), type);
  const { data: watchlistStatus, isLoading: isCheckingWatchlist } = useWatchlistStatus(params.id);
  const { mutate: addToWatchlist, isPending: isAddingToWatchlist } = useAddToWatchlistFromTMDB();
  const { mutate: removeFromWatchlist, isPending: isRemovingFromWatchlist } = useRemoveFromWatchlist();

  const isInWatchlist = watchlistStatus?.inWatchlist || false;
  const watchlistItemId = watchlistStatus?.itemId;

  const handleAddToWatchlist = () => {
    if (content) {
      setError(null);
      setSuccess(null);
      addToWatchlist(
        {
          tmdbId: content.tmdbId,
          type: content.type,
          title: content.title,
          overview: content.overview,
          posterPath: content.posterPath,
          backdropPath: content.backdropPath,
          releaseDate: content.releaseDate,
          genres: content.genres,
          rating: content.tmdbRating ? Number(content.tmdbRating) : undefined,
          status: 'to_watch',
        },
        {
          onSuccess: () => {
            setSuccess('Added to watchlist!');
          },
          onError: (error: any) => {
            console.error('Failed to add to watchlist:', error);
            const errorMessage = error?.response?.data?.error?.message || error.message || 'Failed to add to watchlist';
            setError(errorMessage);
          },
        }
      );
    }
  };

  const handleRemoveFromWatchlist = () => {
    if (watchlistItemId) {
      setError(null);
      setSuccess(null);
      removeFromWatchlist(watchlistItemId, {
        onSuccess: () => {
          setSuccess('Removed from watchlist!');
        },
        onError: (error: any) => {
          console.error('Failed to remove from watchlist:', error);
          const errorMessage = error?.response?.data?.error?.message || error.message || 'Failed to remove from watchlist';
          setError(errorMessage);
        },
      });
    }
  };

  const handleSimilarContentSelect = (similarItem: ContentCardType) => {
    router.push(`/content/${similarItem.tmdbId}?type=${similarItem.type}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!content) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Content not found</h1>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </Container>
    );
  }

  const backdropUrl = content.backdropPath
    ? `https://image.tmdb.org/t/p/original${content.backdropPath}`
    : '';

  return (
    <div>
      <div
        className="relative h-[60vh] bg-cover bg-center"
        style={{
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none',
          backgroundColor: !backdropUrl ? '#1F1F1F' : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent" />

        <Container className="relative h-full flex items-end pb-12">
          <div className="flex gap-8">
            {content.posterPath && (
              <img
                src={`https://image.tmdb.org/t/p/w500${content.posterPath}`}
                alt={content.title}
                className="w-64 rounded-lg shadow-2xl"
              />
            )}
            <div className="flex-1">
              <h1 className="text-5xl font-display font-bold mb-4">
                {content.title}
              </h1>
              <div className="flex items-center gap-4 mb-6 text-text-secondary">
                {content.releaseDate && (
                  <span>{new Date(content.releaseDate).getFullYear()}</span>
                )}
                {content.runtime && <span>{content.runtime} min</span>}
                {content.tmdbRating && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    <span className="font-semibold">
                      {Number(content.tmdbRating).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {content.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 bg-background-card rounded-full text-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  {isInWatchlist ? (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleRemoveFromWatchlist}
                      isLoading={isRemovingFromWatchlist}
                      disabled={isCheckingWatchlist}
                    >
                      Remove from Watchlist
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleAddToWatchlist}
                      isLoading={isAddingToWatchlist}
                      disabled={isCheckingWatchlist}
                    >
                      Add to Watchlist
                    </Button>
                  )}
                  {content.trailerUrl && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => window.open(content.trailerUrl, '_blank')}
                    >
                      Watch Trailer
                    </Button>
                  )}
                </div>
                {success && (
                  <div className="text-green-500 text-sm">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="text-red-500 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-12">
        {content.overview && (
          <section className="mb-12">
            <h2 className="text-2xl font-display font-bold mb-4">Overview</h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              {content.overview}
            </p>
          </section>
        )}

        {content.cast && content.cast.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-display font-bold mb-6">Cast</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {content.cast.slice(0, 6).map((member) => (
                <div key={member.id} className="text-center">
                  {member.profilePath && (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${member.profilePath}`}
                      alt={member.name}
                      className="w-full rounded-lg mb-2"
                    />
                  )}
                  <p className="font-medium text-sm">{member.name}</p>
                  {member.character && (
                    <p className="text-xs text-text-secondary">{member.character}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {similarContent && similarContent.length > 0 && (
          <section>
            <h2 className="text-2xl font-display font-bold mb-6">
              Similar {type === 'movie' ? 'Movies' : 'Shows'}
            </h2>
            <Grid cols={5} gap={6}>
              {similarContent.map((item) => (
                <ContentCard
                  key={item.id}
                  content={item}
                  onSelect={handleSimilarContentSelect}
                />
              ))}
            </Grid>
          </section>
        )}
      </Container>
    </div>
  );
}
