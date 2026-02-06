import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@watchagent/api-client';
import type {
  ContentSearchFilters,
  ContentType,
} from '@watchagent/shared';

export function useContentSearch(filters: ContentSearchFilters) {
  return useQuery({
    queryKey: ['content', 'search', filters],
    queryFn: () => contentApi.search(filters),
    enabled: !!filters.query || !!filters.genres?.length,
  });
}

export function useContentDetails(tmdbId: number, type: ContentType) {
  return useQuery({
    queryKey: ['content', 'details', tmdbId, type],
    queryFn: () => contentApi.getDetails(tmdbId, type),
    enabled: !!tmdbId && !!type,
  });
}

export function useTrending(
  type: ContentType = 'movie',
  timeWindow: 'day' | 'week' = 'week'
) {
  return useQuery({
    queryKey: ['content', 'trending', type, timeWindow],
    queryFn: () => contentApi.getTrending(type, timeWindow),
  });
}

export function usePopular(type: ContentType = 'movie', page: number = 1) {
  return useQuery({
    queryKey: ['content', 'popular', type, page],
    queryFn: () => contentApi.getPopular(type, page),
  });
}

export function useDiscover(filters: ContentSearchFilters) {
  return useQuery({
    queryKey: ['content', 'discover', filters],
    queryFn: () => contentApi.discover(filters),
  });
}
