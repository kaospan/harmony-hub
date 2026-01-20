// Supabase Edge Function: Spotify search for connected user
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

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

async function getUser(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace(/Bearer\s+/i, '');
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function getTokens(userId: string) {
  const { data, error } = await serviceClient.rpc('get_spotify_credentials', { p_user_id: userId }).maybeSingle();
  if (error) throw error;
  if (!data?.access_token) throw new Error('Spotify not connected');
  return data;
}

async function refreshToken(refreshToken: string) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) throw new Error('Spotify env missing');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const basic = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body,
  });
  if (!res.ok) throw new Error('Spotify refresh failed');
  return await res.json();
}

async function ensureToken(userId: string, creds: any) {
  if (creds.expires_at && new Date(creds.expires_at).getTime() - Date.now() < 60_000 && creds.refresh_token) {
    const refreshed = await refreshToken(creds.refresh_token);
    const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
    await serviceClient.rpc('store_spotify_tokens', {
      p_user_id: userId,
      p_access_token: refreshed.access_token,
      p_refresh_token: refreshed.refresh_token ?? creds.refresh_token,
      p_expires_at: expiresAt,
      p_scope: refreshed.scope ?? creds.scope ?? '',
    });
    const again = await getTokens(userId);
    return again.access_token as string;
  }
  return creds.access_token as string;
}

async function searchSpotify(accessToken: string, query: string, limit = 10, market?: string) {
  const params = new URLSearchParams({ q: query, type: 'track', limit: String(limit) });
  if (market) params.set('market', market);
  const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify search failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.tracks?.items ?? [];
}

function artistNames(artists: { name: string }[]) {
  return artists?.map((a) => a.name) ?? [];
}

async function upsertTrack(item: any): Promise<string> {
  const artists = artistNames(item.artists);
  const artistPrimary = artists[0] ?? '';
  const isrc = item.external_ids?.isrc ?? null;

  if (isrc) {
    const { data } = await serviceClient.from('tracks').select('id').eq('isrc', isrc).maybeSingle();
    if (data?.id) {
      await serviceClient.from('tracks').update({
        title: item.name,
        artist: artistPrimary,
        artists,
        album: item.album?.name ?? null,
        artwork_url: item.album?.images?.[0]?.url ?? null,
        duration_ms: item.duration_ms,
      }).eq('id', data.id);
      await serviceClient.from('track_provider_links').upsert({
        track_id: data.id,
        provider: 'spotify',
        provider_track_id: item.id,
        url_web: `https://open.spotify.com/track/${item.id}`,
        url_app: `spotify:track:${item.id}`,
      });
      await serviceClient.from('external_tracks').upsert({
        provider: 'spotify',
        provider_track_id: item.id,
        title: item.name,
        artist: artists.join(', '),
        album: item.album?.name ?? null,
        duration_ms: item.duration_ms,
        artwork_url: item.album?.images?.[0]?.url ?? null,
        isrc,
        raw_payload: item,
      });
      return data.id;
    }
  }

  const { data: existing } = await serviceClient
    .from('tracks')
    .select('id')
    .eq('title', item.name)
    .eq('artist', artistPrimary)
    .maybeSingle();
  const trackId = existing?.id;

  const finalId = trackId ?? (await serviceClient
    .from('tracks')
    .insert({
      title: item.name,
      artist: artistPrimary,
      artists,
      album: item.album?.name ?? null,
      artwork_url: item.album?.images?.[0]?.url ?? null,
      duration_ms: item.duration_ms,
      isrc,
    })
    .select('id')
    .single()).data.id;

  await serviceClient.from('track_provider_links').upsert({
    track_id: finalId,
    provider: 'spotify',
    provider_track_id: item.id,
    url_web: `https://open.spotify.com/track/${item.id}`,
    url_app: `spotify:track:${item.id}`,
  });

  await serviceClient.from('external_tracks').upsert({
    provider: 'spotify',
    provider_track_id: item.id,
    title: item.name,
    artist: artists.join(', '),
    album: item.album?.name ?? null,
    duration_ms: item.duration_ms,
    artwork_url: item.album?.images?.[0]?.url ?? null,
    isrc,
    raw_payload: item,
  });

  return finalId;
}

function toUnified(item: any, trackId: string) {
  return {
    track_id: trackId,
    title: item.name,
    artist: item.artists?.map((a: any) => a.name).join(', '),
    artwork_url: item.album?.images?.[0]?.url ?? null,
    providers: {
      spotify: { playable: true, provider_track_id: item.id },
    },
  };
}

Deno.serve(async (req) => {
  try {
    const user = await getUser(req);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { query, limit, market } = await req.json();
    if (!query) return new Response('Missing query', { status: 400 });

    const creds = await getTokens(user.id);
    const accessToken = await ensureToken(user.id, creds);
    const items = await searchSpotify(accessToken, query, limit ?? 10, market ?? undefined);

    const unified = [] as any[];
    for (const item of items) {
      const trackId = await upsertTrack(item);
      unified.push(toUnified(item, trackId));
    }

    return new Response(JSON.stringify({ results: unified }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('search_spotify error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
