import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi } from '@watchagent/api-client';
import type {
  GetWatchlistRequest,
  AddToWatchlistRequest,
  AddToWatchlistWithTMDBRequest,
  UpdateWatchlistRequest,
} from '@watchagent/shared';

export function useWatchlist(filters?: GetWatchlistRequest) {
  const queryClient = useQueryClient();

  const addToWatchlistMutation = useMutation({
    mutationFn: (data: AddToWatchlistWithTMDBRequest) =>
      watchlistApi.addToWatchlistFromTMDB(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const query = useQuery({
    queryKey: ['watchlist', filters],
    queryFn: () => watchlistApi.getWatchlist(filters),
  });

  return {
    ...query,
    addToWatchlistMutation,
  };
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddToWatchlistRequest) =>
      watchlistApi.addToWatchlist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export function useAddToWatchlistFromTMDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddToWatchlistWithTMDBRequest) =>
      watchlistApi.addToWatchlistFromTMDB(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export function useUpdateWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWatchlistRequest }) =>
      watchlistApi.updateWatchlistItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => watchlistApi.removeFromWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist-status'] });
    },
  });
}

export function useWatchlistStatus(tmdbId?: string) {
  return useQuery({
    queryKey: ['watchlist-status', tmdbId],
    queryFn: () => watchlistApi.checkWatchlistStatus(tmdbId!),
    enabled: !!tmdbId,
  });
}
