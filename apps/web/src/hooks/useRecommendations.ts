import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recommendationsApi } from '@watchagent/api-client';
import type {
  GetRecommendationsRequest,
  ContentType,
} from '@watchagent/shared';

export function useRecommendations(params?: GetRecommendationsRequest & { enabled?: boolean }) {
  const { enabled, ...queryParams } = params || {};

  console.error('[useRecommendations] Called with enabled:', enabled);
  console.error('[useRecommendations] Will pass to useQuery enabled:', enabled !== false);

  const result = useQuery({
    queryKey: ['recommendations', queryParams, enabled], // Include enabled in key
    queryFn: async () => {
      console.error('[useRecommendations] queryFn EXECUTING - checking if should fetch...');

      // CRITICAL: Double-check enabled flag inside queryFn as last line of defense
      if (enabled === false) {
        console.error('[useRecommendations] queryFn BLOCKED - enabled is false, returning empty array');
        return [];
      }

      console.error('[useRecommendations] queryFn PROCEEDING - fetching recommendations!');
      return recommendationsApi.getPersonalizedRecommendations(queryParams);
    },
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on 401 errors
    enabled: enabled !== false, // Default to true, only disable if explicitly false
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchOnMount: false, // Don't refetch on mount if data exists
  });

  console.error('[useRecommendations] Result:', {
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    hasData: !!result.data
  });

  return result;
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
