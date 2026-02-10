'use client';

import { Container, Loading, EmptyState, Button, ContentCardWithFeedback } from '@watchagent/ui';
import { useRecommendations, useRefreshRecommendations } from '@/hooks/useRecommendations';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

export default function RecommendationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: recommendations, isLoading, refetch } = useRecommendations();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshRecommendations();

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  const handleRefresh = () => {
    refresh();
  };

  const handleRemove = async (content: ContentCardType, reason: 'not_relevant' | 'watched', rating?: number) => {
    try {
      const { recommendationsApi } = await import('@watchagent/api-client');

      const result = await recommendationsApi.submitFeedback({
        contentId: content.id,
        contentTitle: content.title,
        action: reason,
        rating,
      });

      if (result.shouldRemoveFromUI) {
        // Immediately remove from UI by updating the query cache
        queryClient.setQueryData(['recommendations', {}], (old: any) => {
          if (!old) return old;
          return old.filter((rec: any) => rec.contentId !== content.id);
        });

        // Invalidate the query to trigger a re-render with the updated cache
        queryClient.invalidateQueries({ queryKey: ['recommendations'], refetchType: 'none' });
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleKeep = async (content: ContentCardType, action: 'keep' | 'watchlist') => {
    try {
      const { recommendationsApi } = await import('@watchagent/api-client');
      const result = await recommendationsApi.submitFeedback({
        contentId: content.id,
        contentTitle: content.title,
        action,
      });

      if (result.shouldRemoveFromUI) {
        // Immediately remove from UI by updating the query cache
        queryClient.setQueryData(['recommendations', {}], (old: any) => {
          if (!old) return old;
          return old.filter((rec: any) => rec.contentId !== content.id);
        });

        // Invalidate the query to trigger a re-render with the updated cache
        queryClient.invalidateQueries({ queryKey: ['recommendations'], refetchType: 'none' });
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {recommendations.map((rec) => (
              <ContentCardWithFeedback
                key={rec.id}
                content={rec.content}
                onSelect={handleContentSelect}
                recommendationReason={rec.reason}
                onRemove={handleRemove}
                onKeep={handleKeep}
              />
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
