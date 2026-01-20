/**
 * Spotify User Data API
 * Fetches user profile, top tracks, recent plays, and audio features
 */

import { getSpotifyAccessToken } from './spotify-auth';
import { Track } from '@/types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string; height: number }>;
  followers: { total: number };
  product: 'free' | 'premium' | 'open';
  country: string;
}

export interface SpotifyTopItem {
  id: string;
  name: string;
  artists?: Array<{ id: string; name: string }>;
  album?: { name: string; images: Array<{ url: string }> };
  genres?: string[];
  images?: Array<{ url: string }>;
  popularity: number;
}

export interface SpotifyRecentPlay {
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: { name: string; images: Array<{ url: string }> };
    duration_ms: number;
    external_urls: { spotify: string };
    uri: string;
  };
  played_at: string;
  context?: { type: string; uri: string };
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  time_signature: number;
}

export interface UserMusicStats {
  topGenres: Array<{ genre: string; count: number }>;
  averageEnergy: number;
  averageDanceability: number;
  averageValence: number;
  averageTempo: number;
  moodProfile: 'energetic' | 'chill' | 'melancholic' | 'upbeat' | 'balanced';
  preferredDecade: string;
  listeningDiversity: number; // 0-1 scale
}

async function spotifyFetch<T>(endpoint: string): Promise<T | null> {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    console.error(`Spotify API error: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json();
}

/**
 * Get current user's Spotify profile
 */
export async function getSpotifyProfile(): Promise<SpotifyUserProfile | null> {
  return spotifyFetch<SpotifyUserProfile>('/me');
}

/**
 * Get user's top tracks
 */
export async function getTopTracks(
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20
): Promise<Track[]> {
  const data = await spotifyFetch<{ items: SpotifyTopItem[] }>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`
  );

  if (!data?.items) return [];

  return data.items.map((item) => ({
    id: item.id,
    title: item.name,
    artist: item.artists?.map((a) => a.name).join(', ') ?? 'Unknown',
    artists: item.artists?.map((a) => a.name),
    album: item.album?.name,
    cover_url: item.album?.images[0]?.url,
    artwork_url: item.album?.images[0]?.url,
    spotify_id: item.id,
    popularity_score: item.popularity,
  }));
}

/**
 * Get user's top artists
 */
export async function getTopArtists(
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20
): Promise<SpotifyTopItem[]> {
  const data = await spotifyFetch<{ items: SpotifyTopItem[] }>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`
  );

  return data?.items ?? [];
}

/**
 * Get user's recently played tracks
 */
export async function getRecentlyPlayed(limit = 50): Promise<SpotifyRecentPlay[]> {
  const data = await spotifyFetch<{ items: SpotifyRecentPlay[] }>(
    `/me/player/recently-played?limit=${limit}`
  );

  return data?.items ?? [];
}

/**
 * Get audio features for multiple tracks
 */
export async function getAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
  if (trackIds.length === 0) return [];
  
  const ids = trackIds.slice(0, 100).join(',');
  const data = await spotifyFetch<{ audio_features: SpotifyAudioFeatures[] }>(
    `/audio-features?ids=${ids}`
  );

  return data?.audio_features?.filter(Boolean) ?? [];
}

/**
 * Search Spotify for tracks
 */
export async function searchSpotifyTracks(
  query: string,
  limit = 20,
  market = 'US'
): Promise<Track[]> {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString(),
    market,
  });

  const data = await spotifyFetch<{ tracks: { items: SpotifyTopItem[] } }>(
    `/search?${params}`
  );

  if (!data?.tracks?.items) return [];

  return data.tracks.items.map((item) => ({
    id: item.id,
    title: item.name,
    artist: item.artists?.map((a) => a.name).join(', ') ?? 'Unknown',
    artists: item.artists?.map((a) => a.name),
    album: item.album?.name,
    cover_url: item.album?.images[0]?.url,
    artwork_url: item.album?.images[0]?.url,
    spotify_id: item.id,
    popularity_score: item.popularity,
  }));
}

/**
 * Compute user's music taste statistics from Spotify data
 */
export async function computeUserMusicStats(): Promise<UserMusicStats | null> {
  const [topTracks, topArtists] = await Promise.all([
    getTopTracks('medium_term', 50),
    getTopArtists('medium_term', 50),
  ]);

  if (topTracks.length === 0) return null;

  // Get audio features for top tracks
  const trackIds = topTracks.map((t) => t.spotify_id).filter(Boolean) as string[];
  const audioFeatures = await getAudioFeatures(trackIds);

  // Compute genre distribution from artists
  const genreCounts: Record<string, number> = {};
  topArtists.forEach((artist) => {
    artist.genres?.forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({ genre, count }));

  // Compute audio feature averages
  const avgEnergy = audioFeatures.reduce((sum, f) => sum + f.energy, 0) / audioFeatures.length;
  const avgDanceability = audioFeatures.reduce((sum, f) => sum + f.danceability, 0) / audioFeatures.length;
  const avgValence = audioFeatures.reduce((sum, f) => sum + f.valence, 0) / audioFeatures.length;
  const avgTempo = audioFeatures.reduce((sum, f) => sum + f.tempo, 0) / audioFeatures.length;

  // Determine mood profile
  let moodProfile: UserMusicStats['moodProfile'] = 'balanced';
  if (avgEnergy > 0.7 && avgValence > 0.6) moodProfile = 'energetic';
  else if (avgEnergy < 0.4 && avgValence > 0.5) moodProfile = 'chill';
  else if (avgValence < 0.35) moodProfile = 'melancholic';
  else if (avgValence > 0.65 && avgDanceability > 0.6) moodProfile = 'upbeat';

  // Calculate genre diversity (unique genres / total genre mentions)
  const totalGenreMentions = Object.values(genreCounts).reduce((a, b) => a + b, 0);
  const uniqueGenres = Object.keys(genreCounts).length;
  const listeningDiversity = totalGenreMentions > 0 
    ? Math.min(1, uniqueGenres / Math.sqrt(totalGenreMentions)) 
    : 0;

  return {
    topGenres,
    averageEnergy: avgEnergy,
    averageDanceability: avgDanceability,
    averageValence: avgValence,
    averageTempo: avgTempo,
    moodProfile,
    preferredDecade: '2020s', // Could be computed from track release dates
    listeningDiversity,
  };
}

/**
 * Get personalized recommendations based on user's taste
 */
export async function getRecommendations(
  seedTrackIds: string[] = [],
  seedArtistIds: string[] = [],
  limit = 20
): Promise<Track[]> {
  // If no seeds provided, use user's top tracks
  if (seedTrackIds.length === 0 && seedArtistIds.length === 0) {
    const topTracks = await getTopTracks('medium_term', 5);
    seedTrackIds = topTracks.map((t) => t.spotify_id).filter(Boolean) as string[];
  }

  const params = new URLSearchParams({
    limit: limit.toString(),
    market: 'US',
  });

  if (seedTrackIds.length > 0) {
    params.set('seed_tracks', seedTrackIds.slice(0, 5).join(','));
  }
  if (seedArtistIds.length > 0) {
    params.set('seed_artists', seedArtistIds.slice(0, 5).join(','));
  }

  const data = await spotifyFetch<{ tracks: SpotifyTopItem[] }>(
    `/recommendations?${params}`
  );

  if (!data?.tracks) return [];

  return data.tracks.map((item) => ({
    id: item.id,
    title: item.name,
    artist: item.artists?.map((a) => a.name).join(', ') ?? 'Unknown',
    artists: item.artists?.map((a) => a.name),
    album: item.album?.name,
    cover_url: item.album?.images[0]?.url,
    artwork_url: item.album?.images[0]?.url,
    spotify_id: item.id,
    popularity_score: item.popularity,
  }));
}
