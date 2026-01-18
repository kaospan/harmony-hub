import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Check if user has liked a track
 */
export function useIsTrackLiked(trackId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['track-liked', trackId, user?.id],
    queryFn: async () => {
      if (!user) return false;

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

/**
 * Get like count for a track (visible to all users)
 * Note: Returns count by querying with anon key, which bypasses user-specific RLS
 */
export function useTrackLikeCount(trackId: string) {
  return useQuery({
    queryKey: ['track-like-count', trackId],
    queryFn: async () => {
      // Use count aggregation which is allowed
      const { count, error } = await supabase
        .from('track_likes')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId);

      if (error) {
        console.warn('Failed to fetch like count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!trackId,
  });
}

/**
 * Get user's total liked tracks count
 */
export function useUserLikedCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-liked-count', user?.id],
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

/**
 * Toggle like on a track
 */
export function useToggleLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!user) throw new Error('Must be signed in to like tracks');

      // Check if already liked
      const { data: existing } = await supabase
        .from('track_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .maybeSingle();

      if (existing) {
        // Unlike
        const { error } = await supabase
          .from('track_likes')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'unliked' };
      } else {
        // Like
        const { error } = await supabase
          .from('track_likes')
          .insert({ user_id: user.id, track_id: trackId });

        if (error) throw error;
        return { action: 'liked' };
      }
    },
    onSuccess: (data, trackId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['track-liked', trackId] });
      queryClient.invalidateQueries({ queryKey: ['track-like-count', trackId] });
      queryClient.invalidateQueries({ queryKey: ['user-liked-count'] });
    },
    onError: (error) => {
      console.error('Failed to toggle like:', error);
      toast.error('Failed to update like');
    },
  });
}

/**
 * Check if user has saved a track
 */
export function useIsTrackSaved(trackId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['track-saved', trackId, user?.id],
    queryFn: async () => {
      if (!user) return false;

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

/**
 * Get save count for a track (visible to all users)
 * Note: Returns count by querying with anon key, which bypasses user-specific RLS
 */
export function useTrackSaveCount(trackId: string) {
  return useQuery({
    queryKey: ['track-save-count', trackId],
    queryFn: async () => {
      // Use count aggregation which is allowed
      const { count, error } = await supabase
        .from('track_saves')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId);

      if (error) {
        console.warn('Failed to fetch save count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!trackId,
  });
}

/**
 * Get user's total saved tracks count
 */
export function useUserSavedCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-saved-count', user?.id],
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

/**
 * Toggle save on a track
 */
export function useToggleSave() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: string) => {
      if (!user) throw new Error('Must be signed in to save tracks');

      // Check if already saved
      const { data: existing } = await supabase
        .from('track_saves')
        .select('id')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .maybeSingle();

      if (existing) {
        // Unsave
        const { error } = await supabase
          .from('track_saves')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'unsaved' };
      } else {
        // Save
        const { error } = await supabase
          .from('track_saves')
          .insert({ user_id: user.id, track_id: trackId });

        if (error) throw error;
        return { action: 'saved' };
      }
    },
    onSuccess: (data, trackId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['track-saved', trackId] });
      queryClient.invalidateQueries({ queryKey: ['track-save-count', trackId] });
      queryClient.invalidateQueries({ queryKey: ['user-saved-count'] });
    },
    onError: (error) => {
      console.error('Failed to toggle save:', error);
      toast.error('Failed to update save');
    },
  });
}
