/**
 * React hooks for play events tracking
 * 
 * NOTE: Uses play_events table to track provider opens.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MusicProvider } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { recordPlayEvent, fetchPlayHistory, fetchPlayStats, PlayAction } from '@/api/playEvents';

interface RecordPlayEventParams {
  track_id: string;
  provider: MusicProvider;
  action: PlayAction;
  context?: string;
  device?: string;
  metadata?: Record<string, unknown>;
}

interface PlayEventData {
  id: string;
  user_id?: string;
  track_id: string;
  provider: string;
  action: string;
  played_at: string;
  context?: string;
}

/**
 * Hook to record a play event
 * Uses user_interactions table as a stand-in until play_events table exists
 */
export function useRecordPlayEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPlayEventParams): Promise<PlayEventData> =>
      recordPlayEvent({
        ...params,
        user_id: user?.id ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['play-history'] });
      queryClient.invalidateQueries({ queryKey: ['play-stats'] });
    },
  });
}

interface PlayHistoryParams {
  limit?: number;
  cursor?: string;
  provider?: MusicProvider;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook to fetch user's play history
 * Uses user_interactions filtered by play_* types
 */
export function usePlayHistory(params: PlayHistoryParams = {}) {
  const { user } = useAuth();
  const { limit = 20 } = params;

  return useQuery({
    queryKey: ['play-history', user?.id, limit],
    queryFn: async (): Promise<PlayEventData[]> => {
      if (!user) return [];
      return fetchPlayHistory(user.id, limit);
    },
    enabled: !!user,
  });
}

/**
 * Hook to get play stats for a user
 */
export function usePlayStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['play-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return fetchPlayStats(user.id);
    },
    enabled: !!user,
  });
}
