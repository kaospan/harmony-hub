// Supabase Edge Function: sync Spotify recently played for current user
// Requires Authorization: Bearer <supabase session token>
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase environment not configured');
}

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SpotifyTrack {
  id: string;
  name: string;
  album: { name: string; images: { url: string }[] };
  artists: { name: string }[];
  duration_ms: number;
  external_ids?: { isrc?: string };
}

interface SpotifyPlayItem {
  track: SpotifyTrack;
  played_at: string;
}

async function getUserFromToken(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace(/Bearer\s+/i, '');
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id };
}

async function getDecryptedTokens(userId: string) {
  const { data, error } = await serviceClient.rpc('get_spotify_credentials', { p_user_id: userId }).maybeSingle();
  if (error) throw error;
  if (!data?.access_token) throw new Error('Spotify not connected');
  return data;
}

async function refreshToken(refreshToken: string) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) throw new Error('Spotify env missing');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const basic = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  if (!res.ok) throw new Error('Spotify refresh failed');
  const json = await res.json();
  return json as { access_token: string; expires_in: number; scope?: string; refresh_token?: string };
}

async function ensureAccessToken(userId: string) {
  let creds = await getDecryptedTokens(userId);
  if (creds.expires_at && new Date(creds.expires_at).getTime() - Date.now() < 60_000 && creds.refresh_token) {
    const refreshed = await refreshToken(creds.refresh_token);
    const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
    const scope = refreshed.scope ?? '';
    await serviceClient.rpc('store_spotify_tokens', {
      p_user_id: userId,
      p_access_token: refreshed.access_token,
      p_refresh_token: refreshed.refresh_token ?? creds.refresh_token,
      p_expires_at: expiresAt,
      p_scope: scope,
    });
    creds = await getDecryptedTokens(userId);
  }
  return creds.access_token as string;
}

async function fetchRecentlyPlayed(accessToken: string): Promise<SpotifyPlayItem[]> {
  const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=30', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify recently played failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return (json.items ?? []) as SpotifyPlayItem[];
}

function normalizeArtists(artists: { name: string }[]): string[] {
  return artists?.map((a) => a.name) ?? [];
}

async function upsertExternalTrack(item: SpotifyTrack) {
  const { error } = await serviceClient.from('external_tracks').upsert({
    provider: 'spotify',
    provider_track_id: item.id,
    title: item.name,
    artist: normalizeArtists(item.artists).join(', '),
    album: item.album?.name ?? null,
    duration_ms: item.duration_ms,
    artwork_url: item.album?.images?.[0]?.url ?? null,
    isrc: item.external_ids?.isrc ?? null,
    raw_payload: item,
  });
  if (error) throw error;
}

async function findOrCreateCanonicalTrack(item: SpotifyTrack): Promise<string> {
  const artistsArr = normalizeArtists(item.artists);
  const artistPrimary = artistsArr[0] ?? '';
  const isrc = item.external_ids?.isrc ?? null;

  // Try match by ISRC first
  if (isrc) {
    const { data } = await serviceClient.from('tracks').select('id').eq('isrc', isrc).maybeSingle();
    if (data?.id) return data.id;
  }

  // Fallback match by title + first artist
  const { data: byMeta } = await serviceClient
    .from('tracks')
    .select('id')
    .eq('title', item.name)
    .eq('artist', artistPrimary)
    .maybeSingle();
  if (byMeta?.id) return byMeta.id;

  // Insert new canonical track
  const { data: inserted, error } = await serviceClient
    .from('tracks')
    .insert({
      title: item.name,
      artist: artistPrimary,
      artists: artistsArr,
      album: item.album?.name ?? null,
      artwork_url: item.album?.images?.[0]?.url ?? null,
      duration_ms: item.duration_ms,
      isrc: isrc,
    })
    .select('id')
    .single();
  if (error) throw error;
  return inserted.id;
}

async function upsertProviderLink(trackId: string, item: SpotifyTrack) {
  const urlWeb = `https://open.spotify.com/track/${item.id}`;
  const urlApp = `spotify:track:${item.id}`;
  const { error } = await serviceClient.from('track_provider_links').upsert({
    track_id: trackId,
    provider: 'spotify',
    provider_track_id: item.id,
    url_web: urlWeb,
    url_app: urlApp,
    url_preview: item?.['preview_url'] ?? null,
  });
  if (error) throw error;
}

async function processItems(items: SpotifyPlayItem[]) {
  const trackIds: string[] = [];
  for (const item of items) {
    if (!item.track) continue;
    await upsertExternalTrack(item.track);
    const canonicalId = await findOrCreateCanonicalTrack(item.track);
    await upsertProviderLink(canonicalId, item.track);
    trackIds.push(canonicalId);
  }
  return trackIds;
}

Deno.serve(async (req) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const accessToken = await ensureAccessToken(user.userId);
    const items = await fetchRecentlyPlayed(accessToken);
    const trackIds = await processItems(items);

    return new Response(JSON.stringify({ track_ids: trackIds }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync_spotify_recently_played error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
