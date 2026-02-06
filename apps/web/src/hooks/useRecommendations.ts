import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recommendationsApi } from '@watchagent/api-client';
import type {
  GetRecommendationsRequest,
  ContentType,
} from '@watchagent/shared';

export function useRecommendations(params?: GetRecommendationsRequest) {
  return useQuery({
    queryKey: ['recommendations', params],
    queryFn: () => recommendationsApi.getPersonalizedRecommendations(params),
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on 401 errors
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}
