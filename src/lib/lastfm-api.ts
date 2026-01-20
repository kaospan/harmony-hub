/**
 * Last.fm API Integration
 * Provides scrobbling history and user stats
 */

const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0';

export interface LastFmUser {
  name: string;
  realname?: string;
  url: string;
  country?: string;
  playcount: string;
  registered: { unixtime: string };
  image: Array<{ '#text': string; size: string }>;
}

export interface LastFmTrack {
  name: string;
  artist: { '#text': string; name?: string };
  album?: { '#text': string };
  url: string;
  image?: Array<{ '#text': string; size: string }>;
  playcount?: string;
  date?: { uts: string; '#text': string };
}

export interface LastFmArtist {
  name: string;
  url: string;
  playcount: string;
  image: Array<{ '#text': string; size: string }>;
}

export interface LastFmStats {
  totalScrobbles: number;
  registeredDate: Date;
  topArtists: Array<{ name: string; playcount: number; imageUrl?: string }>;
  topTracks: Array<{ name: string; artist: string; playcount: number }>;
  recentTracks: Array<{ name: string; artist: string; album?: string; playedAt?: Date }>;
  weeklyArtistCount: number;
  weeklyTrackCount: number;
}

async function lastFmFetch<T>(method: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!LASTFM_API_KEY) {
    console.warn('Last.fm API key not configured');
    return null;
  }

  const queryParams = new URLSearchParams({
    method,
    api_key: LASTFM_API_KEY,
    format: 'json',
    ...params,
  });

  try {
    const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.error) {
      console.error(`Last.fm API error: ${data.message}`);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Last.fm API request failed:', error);
    return null;
  }
}

/**
 * Get Last.fm user info
 */
export async function getLastFmUserInfo(username: string): Promise<LastFmUser | null> {
  const data = await lastFmFetch<{ user: LastFmUser }>('user.getinfo', { user: username });
  return data?.user ?? null;
}

/**
 * Get user's top artists
 */
export async function getLastFmTopArtists(
  username: string,
  period: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' = '3month',
  limit = 10
): Promise<LastFmArtist[]> {
  const data = await lastFmFetch<{ topartists: { artist: LastFmArtist[] } }>('user.gettopartists', {
    user: username,
    period,
    limit: limit.toString(),
  });
  return data?.topartists?.artist ?? [];
}

/**
 * Get user's top tracks
 */
export async function getLastFmTopTracks(
  username: string,
  period: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' = '3month',
  limit = 10
): Promise<LastFmTrack[]> {
  const data = await lastFmFetch<{ toptracks: { track: LastFmTrack[] } }>('user.gettoptracks', {
    user: username,
    period,
    limit: limit.toString(),
  });
  return data?.toptracks?.track ?? [];
}

/**
 * Get user's recent tracks
 */
export async function getLastFmRecentTracks(username: string, limit = 20): Promise<LastFmTrack[]> {
  const data = await lastFmFetch<{ recenttracks: { track: LastFmTrack[] } }>('user.getrecenttracks', {
    user: username,
    limit: limit.toString(),
  });
  return data?.recenttracks?.track ?? [];
}

/**
 * Get weekly artist chart
 */
export async function getLastFmWeeklyArtists(username: string): Promise<LastFmArtist[]> {
  const data = await lastFmFetch<{ weeklyartistchart: { artist: LastFmArtist[] } }>('user.getweeklyartistchart', {
    user: username,
  });
  return data?.weeklyartistchart?.artist ?? [];
}

/**
 * Get full Last.fm stats for a user
 */
export async function getLastFmStats(username: string): Promise<LastFmStats | null> {
  const [userInfo, topArtists, topTracks, recentTracks, weeklyArtists] = await Promise.all([
    getLastFmUserInfo(username),
    getLastFmTopArtists(username, '3month', 10),
    getLastFmTopTracks(username, '3month', 10),
    getLastFmRecentTracks(username, 20),
    getLastFmWeeklyArtists(username),
  ]);

  if (!userInfo) return null;

  const getImageUrl = (images: Array<{ '#text': string; size: string }> | undefined): string | undefined => {
    if (!images) return undefined;
    const large = images.find(i => i.size === 'large') ?? images[images.length - 1];
    return large?.['#text'] || undefined;
  };

  return {
    totalScrobbles: parseInt(userInfo.playcount, 10),
    registeredDate: new Date(parseInt(userInfo.registered.unixtime, 10) * 1000),
    topArtists: topArtists.map(a => ({
      name: a.name,
      playcount: parseInt(a.playcount, 10),
      imageUrl: getImageUrl(a.image),
    })),
    topTracks: topTracks.map(t => ({
      name: t.name,
      artist: typeof t.artist === 'string' ? t.artist : t.artist['#text'] || t.artist.name || 'Unknown',
      playcount: parseInt(t.playcount || '0', 10),
    })),
    recentTracks: recentTracks.map(t => ({
      name: t.name,
      artist: typeof t.artist === 'string' ? t.artist : t.artist['#text'] || t.artist.name || 'Unknown',
      album: t.album?.['#text'],
      playedAt: t.date ? new Date(parseInt(t.date.uts, 10) * 1000) : undefined,
    })),
    weeklyArtistCount: weeklyArtists.length,
    weeklyTrackCount: recentTracks.length,
  };
}

/**
 * Search Last.fm for tracks
 */
export async function searchLastFmTracks(query: string, limit = 20): Promise<LastFmTrack[]> {
  const data = await lastFmFetch<{ results: { trackmatches: { track: LastFmTrack[] } } }>('track.search', {
    track: query,
    limit: limit.toString(),
  });
  return data?.results?.trackmatches?.track ?? [];
}
