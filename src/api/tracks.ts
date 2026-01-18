import { supabase } from '@/integrations/supabase/client';
import { Track } from '@/types';

export async function searchTracksByText(query: string, limit = 20): Promise<Track[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .ilike('title', `%${query}%`)
    .limit(limit);

  if (error) throw error;

  return mapTracks(data || []);
}

export async function searchTracksByArtist(query: string, limit = 20): Promise<Track[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .ilike('artist', `%${query}%`)
    .limit(limit);

  if (error) throw error;

  return mapTracks(data || []);
}

export async function searchTracksByQuery(query: string, limit = 20): Promise<Track[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;

  return mapTracks(data || []);
}

export async function searchTracksByProgression(chords: string[], limit = 20): Promise<Track[]> {
  if (chords.length === 0) return [];

  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .contains('progression_roman', chords)
    .limit(limit);

  if (error) throw error;

  return mapTracks(data || []);
}

export async function fetchTrendingTracks(limit = 10): Promise<Track[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return mapTracks(data || []);
}

export async function fetchTracksForCompare(limit = 50): Promise<Track[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return mapTracks(data || []);
}

function mapTracks(rows: any[]): Track[] {
  return rows.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    artists: track.artists || (track.artist ? [track.artist] : []),
    album: track.album,
    artwork_url: track.artwork_url,
    cover_url: track.artwork_url,
    duration_ms: track.duration_ms,
    isrc: track.isrc,
    detected_key: track.detected_key,
    detected_mode: track.detected_mode,
    progression_roman: track.progression_roman,
    loop_length_bars: track.loop_length_bars,
    cadence_type: track.cadence_type,
    confidence_score: track.confidence_score,
    energy: track.energy,
    danceability: track.danceability,
    valence: track.valence,
    external_id: track.external_id,
    provider: track.provider,
    popularity_score: track.popularity_score,
    created_at: track.created_at,
    updated_at: track.updated_at,
  }));
}
