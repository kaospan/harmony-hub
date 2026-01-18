import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TrackSave {
  id: string;
  user_id: string;
  track_id: string;
  created_at: string;
}

export function useTrackSaves(trackId: string) {
  return useQuery({
    queryKey: ['track-saves', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('track_saves')
        .select('*')
        .eq('track_id', trackId);

      if (error) throw error;
      return data as TrackSave[];
    },
    enabled: !!trackId,
  });
}

export function useUserSavedTracks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-saved-tracks', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('track_saves')
        .select('track_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(item => item.track_id);
    },
    enabled: !!user,
  });
}

export function useIsTrackSaved(trackId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-track-saved', trackId, user?.id],
    queryFn: async () => {
      if (!user || !trackId) return false;

      const { data, error } = await supabase
        .from('track_saves')
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

export function useSaveTrack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('track_saves')
        .insert({ user_id: user.id, track_id: trackId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, trackId) => {
      queryClient.invalidateQueries({ queryKey: ['track-saves', trackId] });
      queryClient.invalidateQueries({ queryKey: ['is-track-saved', trackId] });
      queryClient.invalidateQueries({ queryKey: ['user-saved-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['saved-count'] });
      toast.success('Track saved!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.info('Already saved');
      } else {
        toast.error('Failed to save track');
      }
    },
  });
}

export function useUnsaveTrack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('track_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId);

      if (error) throw error;
    },
    onSuccess: (_, trackId) => {
      queryClient.invalidateQueries({ queryKey: ['track-saves', trackId] });
      queryClient.invalidateQueries({ queryKey: ['is-track-saved', trackId] });
      queryClient.invalidateQueries({ queryKey: ['user-saved-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['saved-count'] });
      toast.success('Track unsaved');
    },
    onError: () => {
      toast.error('Failed to unsave track');
    },
  });
}

export function useSavedTracksCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saved-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('track_saves')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}
