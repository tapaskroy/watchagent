'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContentCardWithFeedback, Loading } from '@watchagent/ui';
import { useRecommendations, useRefreshRecommendations } from '@/hooks/useRecommendations';
import { useChat } from '@/hooks/useChat';
import { useQueryClient } from '@tanstack/react-query';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { conversation, isLoading: isLoadingConversation } = useChat();

  const isOnboarded = !!(conversation && !conversation.isOnboarding && conversation.onboardingCompleted);
  const { data: recommendations, isLoading: isLoadingRecs, refetch } = useRecommendations({ enabled: isOnboarded });
  const { mutate: refreshRecommendations, isPending: isRefreshing } = useRefreshRecommendations();

  // Set when arriving from completed onboarding — shows overlay while polling for recs
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('watchagent_generating_recs')) {
      setIsGeneratingRecs(true);
    }
  }, []);

  // Poll for recs once onboarding is confirmed and recs are empty
  useEffect(() => {
    if (!isGeneratingRecs || !isOnboarded) return;

    // If recs already arrived (cached), clear immediately
    if (recommendations && recommendations.length > 0) {
      sessionStorage.removeItem('watchagent_generating_recs');
      setIsGeneratingRecs(false);
      return;
    }

    let cancelled = false;
    const poll = async (attempts = 0) => {
      if (cancelled) return;
      try {
        const r = await refetch();
        if (cancelled) return;
        if (r.data && r.data.length > 0) {
          sessionStorage.removeItem('watchagent_generating_recs');
          setIsGeneratingRecs(false);
        } else if (attempts < 20) {
          setTimeout(() => poll(attempts + 1), 3000);
        } else {
          sessionStorage.removeItem('watchagent_generating_recs');
          setIsGeneratingRecs(false);
        }
      } catch {
        if (cancelled) return;
        if (attempts < 20) setTimeout(() => poll(attempts + 1), 3000);
        else { sessionStorage.removeItem('watchagent_generating_recs'); setIsGeneratingRecs(false); }
      }
    };

    const timer = setTimeout(() => poll(), 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isGeneratingRecs, isOnboarded, recommendations]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  const handleRemove = async (content: ContentCardType, reason: 'not_relevant' | 'watched', rating?: number) => {
    try {
      const { recommendationsApi } = await import('@watchagent/api-client');
      const result = await recommendationsApi.submitFeedback({ contentId: content.id, contentTitle: content.title, action: reason, rating });
      if (result.shouldRemoveFromUI) {
        queryClient.setQueryData(['recommendations', {}], (old: any) => old?.filter((rec: any) => rec.contentId !== content.id));
        queryClient.invalidateQueries({ queryKey: ['recommendations'], refetchType: 'none' });
      }
    } catch (err) { console.error('Failed to submit feedback:', err); }
  };

  const handleKeep = async (content: ContentCardType, action: 'keep' | 'watchlist') => {
    try {
      const { recommendationsApi } = await import('@watchagent/api-client');
      const result = await recommendationsApi.submitFeedback({ contentId: content.id, contentTitle: content.title, action });
      if (result.shouldRemoveFromUI) {
        queryClient.setQueryData(['recommendations', {}], (old: any) => old?.filter((rec: any) => rec.contentId !== content.id));
        queryClient.invalidateQueries({ queryKey: ['recommendations'], refetchType: 'none' });
      }
    } catch (err) { console.error('Failed to submit feedback:', err); }
  };

  // Generating overlay — shown after onboarding completes while recs are being built
  if (isGeneratingRecs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Loading size="lg" />
        <p className="mt-6 text-lg text-text-secondary">Generating your personalized recommendations...</p>
        <p className="mt-2 text-sm text-text-secondary">This may take up to a minute</p>
      </div>
    );
  }

  if (isLoadingConversation) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  // Not yet onboarded — prompt user to go to Chat
  if (!isOnboarded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-4xl font-display font-bold text-primary mb-4">Welcome to WatchAgent</h1>
        <p className="text-text-secondary mb-8 max-w-md">
          Chat with your personal AI to set up your taste profile and get personalized recommendations.
        </p>
        <button
          onClick={() => router.push('/chat')}
          className="px-8 py-3 bg-primary text-white rounded-full font-medium hover:bg-red-600 transition-colors"
        >
          Get Started →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-text-primary">Today's Picks</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => refreshRecommendations()}
            disabled={isRefreshing}
            className="text-sm text-primary hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? 'Refreshing...' : '↺ Refresh'}
          </button>
          <button
            onClick={() => router.push('/recommendations')}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            See all →
          </button>
        </div>
      </div>

      {isLoadingRecs ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <Loading size="lg" />
        </div>
      ) : recommendations && recommendations.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {recommendations.map((rec: any) => (
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
      ) : (
        <div className="text-center py-16">
          <p className="text-text-secondary mb-4">No recommendations yet.</p>
          <button
            onClick={() => router.push('/chat')}
            className="text-primary hover:text-red-400 transition-colors"
          >
            Chat with WatchAgent to get started →
          </button>
        </div>
      )}
    </div>
  );
}
