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
    queryKey: ['recommendations', queryParams],
    queryFn: () => {
      console.error('[useRecommendations] queryFn EXECUTING - fetching recommendations!');
      return recommendationsApi.getPersonalizedRecommendations(queryParams);
    },
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on 401 errors
    enabled: enabled !== false, // Default to true, only disable if explicitly false
    refetchOnWindowFocus: false, // CRITICAL: Don't refetch on focus, respect enabled parameter
    refetchOnReconnect: false, // Also don't refetch on reconnect
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
