import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Track } from '@/types';

/**
 * Fetch feed items with their tracks
 */
export function useFeed(limit = 50) {
  return useQuery({
    queryKey: ['feed', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_items')
        .select(`
          id,
          track_id,
          rank,
          source,
          created_at,
          tracks (
            id,
            title,
            artist,
            album,
            cover_url,
            detected_key,
            detected_mode,
            progression_roman,
            loop_length_bars,
            cadence_type,
            confidence_score,
            energy,
            danceability,
            valence,
            preview_url,
            spotify_id,
            youtube_id,
            url_spotify_web,
            url_spotify_app,
            url_youtube,
            duration_ms,
            isrc
          )
        `)
        .order('rank', { ascending: true })
        .limit(limit);

      if (error) throw error;

      // Map to Track type
      const tracks: Track[] = (data || []).map((item: any) => {
        const track = item.tracks;
        return {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          cover_url: track.cover_url,
          artwork_url: track.cover_url,
          detected_key: track.detected_key,
          detected_mode: track.detected_mode,
          progression_roman: track.progression_roman,
          loop_length_bars: track.loop_length_bars,
          cadence_type: track.cadence_type,
          confidence_score: track.confidence_score,
          energy: track.energy,
          danceability: track.danceability,
          valence: track.valence,
          preview_url: track.preview_url,
          spotify_id: track.spotify_id,
          youtube_id: track.youtube_id,
          url_spotify_web: track.url_spotify_web,
          url_spotify_app: track.url_spotify_app,
          url_youtube: track.url_youtube,
          duration_ms: track.duration_ms,
          isrc: track.isrc,
        } as Track;
      });

      return tracks;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch track provider links
 */
export function useTrackProviderLinks(trackId: string) {
  return useQuery({
    queryKey: ['track-provider-links', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('track_provider_links')
        .select('*')
        .eq('track_id', trackId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!trackId,
  });
}
