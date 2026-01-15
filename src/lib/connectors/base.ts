/**
 * Base provider connector interface
 * All music service providers must implement this interface
 */

import { MusicProvider, ProviderLink, Track } from '@/types';

export interface NormalizedTrack {
  title: string;
  artists: string[];
  album?: string;
  duration_ms?: number;
  artwork_url?: string;
  isrc?: string;
  provider_track_id: string;
  provider: MusicProvider;
  url_web?: string;
  url_app?: string;
  url_preview?: string;
  energy?: number;
  danceability?: number;
  valence?: number;
}

export interface SearchOptions {
  query: string;
  market?: string;
  limit?: number;
  timeout?: number; // Milliseconds before giving up
}

export interface ProviderConnector {
  readonly name: MusicProvider;
  readonly enabled: boolean;
  
  /**
   * Search for tracks on this provider
   * Must return normalized track data or throw error
   */
  searchTracks(options: SearchOptions): Promise<NormalizedTrack[]>;
  
  /**
   * Resolve full links for a track by provider track ID
   * Returns web, app, and preview URLs
   */
  resolveLinks(providerTrackId: string): Promise<ProviderLink>;
  
  /**
   * Check if the provider is properly configured and accessible
   */
  checkHealth(): Promise<boolean>;
}

/**
 * Helper to execute provider search with timeout
 */
export async function searchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  providerName: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`${providerName} timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Normalize track title for comparison (remove special chars, lowercase)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two tracks are likely the same based on title, artist, and duration
 */
export function tracksAreSimilar(
  track1: NormalizedTrack,
  track2: NormalizedTrack,
  durationToleranceMs: number = 2000
): boolean {
  const title1 = normalizeString(track1.title);
  const title2 = normalizeString(track2.title);
  
  if (title1 !== title2) return false;
  
  // Check if at least one artist matches
  const artists1 = track1.artists.map(a => normalizeString(a));
  const artists2 = track2.artists.map(a => normalizeString(a));
  const hasCommonArtist = artists1.some(a1 => artists2.includes(a1));
  
  if (!hasCommonArtist) return false;
  
  // If both have duration, check tolerance
  if (track1.duration_ms && track2.duration_ms) {
    const durationDiff = Math.abs(track1.duration_ms - track2.duration_ms);
    return durationDiff <= durationToleranceMs;
  }
  
  // If duration not available, consider them similar based on title+artist
  return true;
}
