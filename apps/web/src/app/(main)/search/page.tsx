'use client';

import { useState } from 'react';
import { Container, Grid, ContentCard, Input, Loading, EmptyState } from '@watchagent/ui';
import { useContentSearch } from '@/hooks/useContent';
import { useRouter } from 'next/navigation';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data, isLoading } = useContentSearch({
    query: debouncedQuery,
    page: 1,
    limit: 20,
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const timeout = setTimeout(() => {
      setDebouncedQuery(value);
    }, 500);
    return () => clearTimeout(timeout);
  };

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-6">
            Search Movies & TV Shows
          </h1>
          <Input
            type="search"
            placeholder="Search for movies, TV shows..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-2xl"
          />
        </div>

        {isLoading && <Loading text="Searching..." />}

        {!isLoading && data && data.items.length > 0 && (
          <div>
            <p className="text-text-secondary mb-6">
              Found {data.meta.total} results
            </p>
            <Grid cols={5} gap={6}>
              {data.items.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onSelect={handleContentSelect}
                />
              ))}
            </Grid>
          </div>
        )}

        {!isLoading && debouncedQuery && data?.items.length === 0 && (
          <EmptyState
            title="No results found"
            description={`We couldn't find any content matching "${debouncedQuery}". Try a different search term.`}
          />
        )}

        {!debouncedQuery && !isLoading && (
          <EmptyState
            title="Start searching"
            description="Enter a movie or TV show name to find what you're looking for."
          />
        )}
      </Container>
    </div>
  );
}
