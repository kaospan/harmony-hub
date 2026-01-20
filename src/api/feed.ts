import { supabase } from '@/integrations/supabase/client';
import { Track } from '@/types';

export async function fetchFeed(limit = 50): Promise<Track[]> {
  const { data: feedItems, error: feedError } = await supabase
    .from('feed_items')
    .select(`
      id,
      track_id,
      source,
      rank,
      tracks (
        id,
        title,
        artist,
        artists,
        album,
        artwork_url,
        duration_ms,
        isrc,
        detected_key,
        detected_mode,
        progression_roman,
        loop_length_bars,
        cadence_type,
        confidence_score,
        energy,
        danceability,
        valence,
        external_id,
        provider,
        popularity_score,
        created_at,
        updated_at
      )
    `)
    .order('rank', { ascending: true })
    .limit(limit);

  if (feedError) throw feedError;
  if (!feedItems || feedItems.length === 0) return [];

  const trackIds = feedItems.map((item) => item.track_id);
  const { data: providerLinks, error: linksError } = await supabase
    .from('track_provider_links')
    .select('*')
    .in('track_id', trackIds);

  if (linksError) throw linksError;

  const tracks: Track[] = feedItems
    .map((item) => {
      const track = item.tracks;
      if (!track) return null;

      const links = providerLinks?.filter((link) => link.track_id === track.id) || [];

      return {
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
        providerLinks: links.map((link) => ({
          provider: link.provider as any,
          provider_track_id: link.provider_track_id,
          url_web: link.url_web,
          url_app: link.url_app,
          url_preview: link.url_preview,
          track_uuid: link.track_id,
        })),
        spotify_id: links.find((l) => l.provider === 'spotify')?.provider_track_id,
        youtube_id: links.find((l) => l.provider === 'youtube')?.provider_track_id,
        url_spotify_web: links.find((l) => l.provider === 'spotify')?.url_web,
        url_spotify_app: links.find((l) => l.provider === 'spotify')?.url_app,
        url_youtube: links.find((l) => l.provider === 'youtube')?.url_web,
        preview_url: links.find((l) => l.url_preview)?.url_preview,
      };
    })
    .filter(Boolean) as Track[];

  return tracks;
}

export async function fetchUserInteractions(userId: string) {
  const { data, error } = await supabase
    .from('user_interactions')
    .select('track_id, interaction_type')
    .eq('user_id', userId)
    .in('interaction_type', ['like', 'save']);

  if (error) throw error;

  const likes = new Set<string>();
  const saves = new Set<string>();

  data?.forEach((interaction) => {
    if (interaction.interaction_type === 'like') {
      likes.add(interaction.track_id);
    } else if (interaction.interaction_type === 'save') {
      saves.add(interaction.track_id);
    }
  });

  return { likes, saves };
}

export async function fetchUserInteractionStats(userId: string) {
  const { data: likesData, error: likesError } = await supabase
    .from('track_likes')
    .select('track_id')
    .eq('user_id', userId);

  if (likesError) throw likesError;

  const { data: savesData, error: savesError } = await supabase
    .from('track_saves')
    .select('track_id')
    .eq('user_id', userId);

  if (savesError) throw savesError;

  return {
    likes: likesData?.length || 0,
    saves: savesData?.length || 0,
    total: (likesData?.length || 0) + (savesData?.length || 0),
  };
}

export async function toggleInteraction(params: {
  trackId: string;
  interactionType: 'like' | 'save' | 'skip' | 'more_harmonic' | 'more_vibe' | 'share';
  userId: string;
}) {
  const { trackId, interactionType, userId } = params;

  if (interactionType === 'like') {
    const { data: existing } = await supabase
      .from('track_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('track_likes').delete().eq('id', existing.id);
      if (error) throw error;
      return { action: 'removed' };
    }

    const { error } = await supabase
      .from('track_likes')
      .insert({ user_id: userId, track_id: trackId });

    if (error) throw error;
    return { action: 'added' };
  }

  if (interactionType === 'save') {
    const { data: existing } = await supabase
      .from('track_saves')
      .select('id')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('track_saves').delete().eq('id', existing.id);
      if (error) throw error;
      return { action: 'removed' };
    }

    const { error } = await supabase
      .from('track_saves')
      .insert({ user_id: userId, track_id: trackId });

    if (error) throw error;
    return { action: 'added' };
  }

  const { data: existing } = await supabase
    .from('user_interactions')
    .select('id')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .eq('interaction_type', interactionType)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('user_interactions').delete().eq('id', existing.id);
    if (error) throw error;
    return { action: 'removed' };
  }

  const { error } = await supabase
    .from('user_interactions')
    .insert({ user_id: userId, track_id: trackId, interaction_type: interactionType });

  if (error) throw error;
  return { action: 'added' };
}

export async function fetchTrackInteractionCounts(trackIds: string[]) {
  if (trackIds.length === 0) return {} as Record<string, { likes: number; saves: number }>;

  const [likesRes, savesRes] = await Promise.all([
    supabase.from('track_likes').select('track_id').in('track_id', trackIds),
    supabase.from('track_saves').select('track_id').in('track_id', trackIds),
  ]);

  if (likesRes.error) throw likesRes.error;
  if (savesRes.error) throw savesRes.error;

  const counts: Record<string, { likes: number; saves: number }> = {};

  likesRes.data?.forEach((row) => {
    counts[row.track_id] = counts[row.track_id] || { likes: 0, saves: 0 };
    counts[row.track_id].likes += 1;
  });

  savesRes.data?.forEach((row) => {
    counts[row.track_id] = counts[row.track_id] || { likes: 0, saves: 0 };
    counts[row.track_id].saves += 1;
  });

  return counts;
}
