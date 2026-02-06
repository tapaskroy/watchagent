'use client';

import { useState } from 'react';
import { Container, Grid, ContentCard, Loading, EmptyState, Button } from '@watchagent/ui';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useRouter } from 'next/navigation';
import type { WatchlistStatus, ContentCard as ContentCardType } from '@watchagent/shared';

export default function WatchlistPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WatchlistStatus | 'all'>('all');

  const { data, isLoading } = useWatchlist(
    activeTab === 'all' ? undefined : { status: activeTab }
  );

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  const tabs: { label: string; value: WatchlistStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'To Watch', value: 'to_watch' },
    { label: 'Watching', value: 'watching' },
    { label: 'Watched', value: 'watched' },
  ];

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-6">My Watchlist</h1>

          <div className="flex gap-4 border-b border-gray-800">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <Loading text="Loading your watchlist..." />}

        {!isLoading && data && data.items.length > 0 && (
          <Grid cols={5} gap={6}>
            {data.items.map((item) => (
              <ContentCard
                key={item.id}
                content={item.content}
                onSelect={handleContentSelect}
              />
            ))}
          </Grid>
        )}

        {!isLoading && data?.items.length === 0 && (
          <EmptyState
            title="Your watchlist is empty"
            description="Start adding movies and TV shows you want to watch."
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
