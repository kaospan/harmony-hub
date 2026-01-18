import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TrackLike {
  id: string;
  user_id: string;
  track_id: string;
  created_at: string;
}

export function useTrackLikes(trackId: string) {
  return useQuery({
    queryKey: ['track-likes', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('track_likes')
        .select('*')
        .eq('track_id', trackId);

      if (error) throw error;
      return data as TrackLike[];
    },
    enabled: !!trackId,
  });
}

export function useUserLikedTracks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-liked-tracks', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('track_likes')
        .select('track_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(item => item.track_id);
    },
    enabled: !!user,
  });
}

export function useIsTrackLiked(trackId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-track-liked', trackId, user?.id],
    queryFn: async () => {
      if (!user || !trackId) return false;

      const { data, error } = await supabase
        .from('track_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!trackId,
  });
}

export function useLikeTrack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('track_likes')
        .insert({ user_id: user.id, track_id: trackId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, trackId) => {
      queryClient.invalidateQueries({ queryKey: ['track-likes', trackId] });
      queryClient.invalidateQueries({ queryKey: ['is-track-liked', trackId] });
      queryClient.invalidateQueries({ queryKey: ['user-liked-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['liked-count'] });
      toast.success('Track liked!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.info('Already liked');
      } else {
        toast.error('Failed to like track');
      }
    },
  });
}

export function useUnlikeTrack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('track_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId);

      if (error) throw error;
    },
    onSuccess: (_, trackId) => {
      queryClient.invalidateQueries({ queryKey: ['track-likes', trackId] });
      queryClient.invalidateQueries({ queryKey: ['is-track-liked', trackId] });
      queryClient.invalidateQueries({ queryKey: ['user-liked-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['liked-count'] });
      toast.success('Track unliked');
    },
    onError: () => {
      toast.error('Failed to unlike track');
    },
  });
}

export function useLikedTracksCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['liked-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('track_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}
