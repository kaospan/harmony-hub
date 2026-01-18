import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Track } from '@/types';
import {
  fetchFeed,
  fetchUserInteractions,
  fetchUserInteractionStats,
  fetchTrackInteractionCounts,
  toggleInteraction,
} from '@/api/feed';

/**
 * Fetch feed items with track details and provider links
 */
export function useFeed(limit = 50) {
  return useQuery({
    queryKey: ['feed', limit],
    queryFn: () => fetchFeed(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get user's likes and saves for tracks
 */
export function useUserInteractions(userId?: string) {
  return useQuery({
    queryKey: ['user-interactions', userId],
    queryFn: async () => {
      if (!userId) return { likes: new Set<string>(), saves: new Set<string>() };
      return fetchUserInteractions(userId);
    },
    enabled: !!userId,
  });
}

/**
 * Toggle a user interaction (like, save, etc.)
 */
export function useToggleInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackId,
      interactionType,
      userId,
    }: {
      trackId: string;
      interactionType: 'like' | 'save' | 'skip' | 'more_harmonic' | 'more_vibe' | 'share';
      userId: string;
    }) => toggleInteraction({ trackId, interactionType, userId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-interactions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-interaction-stats', variables.userId] });
    },
  });
}

/**
 * Get interaction counts for tracks
 */
export function useTrackInteractionCounts(trackIds: string[]) {
  return useQuery({
    queryKey: ['track-interaction-counts', trackIds],
    queryFn: () => fetchTrackInteractionCounts(trackIds),
    enabled: trackIds.length > 0,
  });
}

/**
 * Get user's interaction stats (total likes, saves, etc.)
 */
export function useUserInteractionStats(userId?: string) {
  return useQuery({
    queryKey: ['user-interaction-stats', userId],
    queryFn: async () => {
      if (!userId) return { likes: 0, saves: 0, total: 0 };
      return fetchUserInteractionStats(userId);
    },
    enabled: !!userId,
  });
}

