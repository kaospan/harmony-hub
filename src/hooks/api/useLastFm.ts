/**
 * React hooks for Last.fm integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  getLastFmStats,
  getLastFmUserInfo,
  getLastFmTopArtists,
  getLastFmTopTracks,
  getLastFmRecentTracks,
  LastFmStats,
} from '@/lib/lastfm-api';

/**
 * Get stored Last.fm username for current user
 */
export function useLastFmUsername() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lastfm-username', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_providers')
        .select('provider_user_id')
        .eq('user_id', user.id)
        .eq('provider', 'lastfm')
        .single();

      if (error || !data) return null;
      return data.provider_user_id;
    },
    enabled: !!user,
  });
}

/**
 * Get Last.fm stats for connected user
 */
export function useLastFmStats() {
  const { data: username } = useLastFmUsername();

  return useQuery<LastFmStats | null>({
    queryKey: ['lastfm-stats', username],
    queryFn: () => (username ? getLastFmStats(username) : null),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get Last.fm stats for any username (for lookup)
 */
export function useLastFmLookup(username: string | null) {
  return useQuery<LastFmStats | null>({
    queryKey: ['lastfm-lookup', username],
    queryFn: () => (username ? getLastFmStats(username) : null),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Connect Last.fm account (just stores username - no OAuth needed)
 */
export function useConnectLastFm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      if (!user) throw new Error('Must be logged in');

      // Verify the username exists on Last.fm
      const userInfo = await getLastFmUserInfo(username);
      if (!userInfo) {
        throw new Error('Last.fm user not found');
      }

      // Store the connection
      const { error } = await supabase.from('user_providers').upsert({
        user_id: user.id,
        provider: 'lastfm',
        provider_user_id: username,
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

      if (error) throw error;
      return userInfo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lastfm-username'] });
      queryClient.invalidateQueries({ queryKey: ['lastfm-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-providers'] });
    },
  });
}

/**
 * Disconnect Last.fm account
 */
export function useDisconnectLastFm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('user_providers')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'lastfm');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lastfm-username'] });
      queryClient.invalidateQueries({ queryKey: ['lastfm-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-providers'] });
    },
  });
}
