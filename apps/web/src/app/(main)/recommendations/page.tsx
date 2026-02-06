'use client';

import { Container, Loading, EmptyState, Button } from '@watchagent/ui';
import { useRecommendations, useRefreshRecommendations } from '@/hooks/useRecommendations';
import { useRouter } from 'next/navigation';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

export default function RecommendationsPage() {
  const router = useRouter();
  const { data: recommendations, isLoading } = useRecommendations();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshRecommendations();

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display font-bold mb-2">
                Personalized Recommendations
              </h1>
              <p className="text-text-secondary">
                AI-powered suggestions based on your taste
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              isLoading={isRefreshing}
            >
              Refresh Recommendations
            </Button>
          </div>
        </div>

        {isLoading && <Loading text="Loading recommendations..." />}

        {!isLoading && recommendations && recommendations.length > 0 && (
          <div className="space-y-8">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-background-card rounded-lg p-6 hover:bg-background-hover transition-colors cursor-pointer"
                onClick={() => handleContentSelect(rec.content)}
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-32">
                    <img
                      src={
                        rec.content.posterPath
                          ? `https://image.tmdb.org/t/p/w200${rec.content.posterPath}`
                          : '/placeholder-poster.png'
                      }
                      alt={rec.content.title}
                      className="w-full rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      {rec.content.title}
                    </h3>
                    <div className="flex items-center gap-4 mb-3 text-sm text-text-secondary">
                      {rec.content.releaseDate && (
                        <span>
                          {new Date(rec.content.releaseDate).getFullYear()}
                        </span>
                      )}
                      {rec.content.tmdbRating && (
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4 fill-current text-yellow-400"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                          <span>{Number(rec.content.tmdbRating).toFixed(1)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-accent-green">
                          {Math.round(rec.score * 100)}% Match
                        </span>
                      </div>
                    </div>
                    <p className="text-text-secondary mb-3">{rec.reason}</p>
                    <div className="flex flex-wrap gap-2">
                      {rec.content.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre.id}
                          className="px-3 py-1 bg-background-dark rounded-full text-xs"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && recommendations?.length === 0 && (
          <EmptyState
            title="No recommendations yet"
            description="Start rating movies and adding items to your watchlist to get personalized recommendations."
            action={
              <Button variant="primary" onClick={() => router.push('/search')}>
                Browse Content
              </Button>
            }
          />
        )}
      </Container>
    </div>
  );
}
