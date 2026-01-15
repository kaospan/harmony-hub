/**
 * Spotify API Connector
 * Implements unified search and link resolution for Spotify
 */

import {
  ProviderConnector,
  NormalizedTrack,
  SearchOptions,
  searchWithTimeout,
} from './base';
import { ProviderLink } from '@/types';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number }>;
  };
  duration_ms: number;
  external_ids?: {
    isrc?: string;
  };
  external_urls: {
    spotify: string;
  };
  preview_url?: string;
  uri: string;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

export class SpotifyConnector implements ProviderConnector {
  readonly name = 'spotify' as const;
  readonly enabled: boolean;
  private accessToken?: string;
  private tokenExpiresAt?: number;
  
  constructor(
    private clientId?: string,
    private clientSecret?: string
  ) {
    this.enabled = !!(clientId && clientSecret);
  }

  /**
   * Get or refresh Spotify access token using client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${this.clientId}:${this.clientSecret}`),
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return this.accessToken;
  }

  async searchTracks(options: SearchOptions): Promise<NormalizedTrack[]> {
    const { query, market = 'US', limit = 10, timeout = 5000 } = options;

    const searchPromise = this.performSearch(query, market, limit);
    const results = await searchWithTimeout(searchPromise, timeout, 'Spotify');

    return results;
  }

  private async performSearch(
    query: string,
    market: string,
    limit: number
  ): Promise<NormalizedTrack[]> {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      market,
      limit: limit.toString(),
    });

    const response = await fetch(
      `https://api.spotify.com/v1/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.statusText}`);
    }

    const data: SpotifySearchResponse = await response.json();

    return data.tracks.items.map(track => this.normalizeTrack(track));
  }

  private normalizeTrack(track: SpotifyTrack): NormalizedTrack {
    // Get largest album art
    const artwork = track.album.images.sort((a, b) => b.height - a.height)[0];

    return {
      title: track.name,
      artists: track.artists.map(a => a.name),
      album: track.album.name,
      duration_ms: track.duration_ms,
      artwork_url: artwork?.url,
      isrc: track.external_ids?.isrc,
      provider_track_id: track.id,
      provider: 'spotify',
      url_web: track.external_urls.spotify,
      url_app: track.uri, // spotify:track:...
      url_preview: track.preview_url,
    };
  }

  async resolveLinks(providerTrackId: string): Promise<ProviderLink> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${providerTrackId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify track fetch failed: ${response.statusText}`);
    }

    const track: SpotifyTrack = await response.json();

    return {
      provider: 'spotify',
      provider_track_id: track.id,
      url_web: track.external_urls.spotify,
      url_app: track.uri,
      url_preview: track.preview_url,
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      console.error('Spotify health check failed:', error);
      return false;
    }
  }
}
