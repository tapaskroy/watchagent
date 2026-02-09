import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recommendationsApi } from '@watchagent/api-client';
import type {
  GetRecommendationsRequest,
  ContentType,
} from '@watchagent/shared';

export function useRecommendations(params?: GetRecommendationsRequest & { enabled?: boolean }) {
  const { enabled, ...queryParams } = params || {};

  return useQuery({
    queryKey: ['recommendations', queryParams],
    queryFn: async () => {
      // Defense-in-depth: Don't fetch if explicitly disabled
      if (enabled === false) {
        return [];
      }
      return recommendationsApi.getPersonalizedRecommendations(queryParams);
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: enabled !== false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export function useSimilarContent(tmdbId: number, type: ContentType) {
  return useQuery({
    queryKey: ['recommendations', 'similar', tmdbId, type],
    queryFn: () => recommendationsApi.getSimilarContent(tmdbId, type),
    enabled: !!tmdbId && !!type,
  });
}

export function useRefreshRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => recommendationsApi.refreshRecommendations(),
    onSuccess: (data) => {
      // Update the cache with fresh data immediately
      queryClient.setQueryData(['recommendations', undefined], data);
      // Also invalidate to trigger refetch for any other components
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}
