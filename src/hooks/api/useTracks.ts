import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Track } from '@/types';

interface FeedItem {
  id: string;
  track_id: string;
  source: string;
  rank: number;
  created_at: string;
  tracks: Track;
}

export function useFeedTracks() {
  return useQuery({
    queryKey: ['feed-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_items')
        .select(`
          id,
          track_id,
          source,
          rank,
          created_at,
          tracks:track_id (
            id,
            title,
            artist,
            artists,
            album,
            duration_ms,
            artwork_url,
            cover_url,
            preview_url,
            isrc,
            external_id,
            provider,
            detected_key,
            detected_mode,
            progression_roman,
            loop_length_bars,
            cadence_type,
            confidence_score,
            analysis_source,
            energy,
            danceability,
            valence,
            spotify_id,
            youtube_id,
            url_spotify_web,
            url_spotify_app,
            url_youtube,
            popularity_score,
            created_at,
            updated_at
          )
        `)
        .order('rank', { ascending: true })
        .limit(50);

      if (error) throw error;

      // Map to Track array, handling the nested structure
      const tracks: Track[] = (data as FeedItem[])
        .map(item => {
          if (!item.tracks) return null;
          
          const track = item.tracks;
          
          return {
            id: track.id,
            title: track.title,
            artist: track.artist || '',
            artists: track.artists,
            album: track.album,
            duration_ms: track.duration_ms,
            artwork_url: track.artwork_url,
            cover_url: track.cover_url || track.artwork_url,
            preview_url: track.preview_url,
            isrc: track.isrc,
            external_id: track.external_id,
            provider: track.provider,
            detected_key: track.detected_key,
            detected_mode: track.detected_mode,
            progression_roman: track.progression_roman,
            loop_length_bars: track.loop_length_bars,
            cadence_type: track.cadence_type,
            confidence_score: track.confidence_score,
            analysis_source: track.analysis_source,
            energy: track.energy,
            danceability: track.danceability,
            valence: track.valence,
            spotify_id: track.spotify_id,
            youtube_id: track.youtube_id,
            url_spotify_web: track.url_spotify_web,
            url_spotify_app: track.url_spotify_app,
            url_youtube: track.url_youtube,
            popularity_score: track.popularity_score,
            created_at: track.created_at,
            updated_at: track.updated_at,
          } as Track;
        })
        .filter((track): track is Track => track !== null);

      return tracks;
    },
  });
}

export function useTrackById(trackId: string) {
  return useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      if (!trackId) return null;

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();

      if (error) throw error;
      return data as Track;
    },
    enabled: !!trackId,
  });
}

export function useTrackProviderLinks(trackId: string) {
  return useQuery({
    queryKey: ['track-provider-links', trackId],
    queryFn: async () => {
      if (!trackId) return [];

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
