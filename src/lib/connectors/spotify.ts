/**
 * Spotify API Connector
 * Implements unified search and link resolution for Spotify
 * 
 * SECURITY: Uses Supabase Edge Function for search (server-side auth)
 * Client secret is NEVER exposed to the browser
 */

import {
  ProviderConnector,
  NormalizedTrack,
  SearchOptions,
  searchWithTimeout,
} from './base';
import { ProviderLink } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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

export class SpotifyConnector implements ProviderConnector {
  readonly name = 'spotify' as const;
  readonly enabled: boolean;
  
  constructor(
    private clientId?: string
    // NOTE: No client secret - auth happens server-side via Edge Function
  ) {
    // Spotify is always enabled - uses Edge Function for search
    this.enabled = true;
  }

  async searchTracks(options: SearchOptions): Promise<NormalizedTrack[]> {
    const { query, market = 'US', limit = 10, timeout = 5000 } = options;

    const searchPromise = this.performSearch(query, market, limit);
    const results = await searchWithTimeout(searchPromise, timeout, 'Spotify');

    return results;
  }

  /**
   * Search using Supabase Edge Function (server-side Spotify auth)
   * Falls back to tracks table if user not authenticated
   */
  private async performSearch(
    query: string,
    market: string,
    limit: number
  ): Promise<NormalizedTrack[]> {
    try {
      // Try Edge Function (for authenticated users with connected Spotify)
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session) {
        const { data, error } = await supabase.functions.invoke('search_spotify', {
          body: { query, limit, market },
        });
        
        if (!error && data?.results) {
          return data.results.map((r: any) => this.normalizeEdgeFunctionResult(r));
        }
      }
      
      // Fallback: Search cached tracks table
      // Sanitize search input to prevent filter injection
      const sanitizedQuery = query.replace(/[%_,().*\\]/g, '');
      const { data: cached } = await supabase
        .from('tracks')
        .select('*')
        .eq('provider', 'spotify')
        .or(`title.ilike.%${sanitizedQuery}%,artist.ilike.%${sanitizedQuery}%`)
        .limit(limit);
      
      if (cached && cached.length > 0) {
        return cached.map(track => this.normalizeCachedTrack(track));
      }
      
      return [];
    } catch (error) {
      console.error('Spotify search failed:', error);
      return [];
    }
  }

  private normalizeEdgeFunctionResult(result: any): NormalizedTrack {
    return {
      title: result.title,
      artists: result.artist?.split(', ') || [],
      album: result.album || '',
      duration_ms: result.duration_ms || 0,
      artwork_url: result.artwork_url,
      isrc: result.isrc,
      provider_track_id: result.providers?.spotify?.provider_track_id || result.spotify_id || '',
      provider: 'spotify',
      url_web: `https://open.spotify.com/track/${result.providers?.spotify?.provider_track_id || result.spotify_id}`,
      url_app: `spotify:track:${result.providers?.spotify?.provider_track_id || result.spotify_id}`,
    };
  }

  private normalizeCachedTrack(track: any): NormalizedTrack {
    return {
      title: track.title,
      artists: track.artist?.split(', ') || [],
      album: track.album || '',
      duration_ms: track.duration_ms || 0,
      artwork_url: track.cover_url,
      isrc: track.isrc,
      provider_track_id: track.spotify_id || track.external_id,
      provider: 'spotify',
      url_web: track.url_spotify_web || `https://open.spotify.com/track/${track.spotify_id || track.external_id}`,
      url_app: track.url_spotify_app || `spotify:track:${track.spotify_id || track.external_id}`,
    };
  }

  async resolveLinks(providerTrackId: string): Promise<ProviderLink> {
    // Look up from tracks table
    const { data } = await supabase
      .from('tracks')
      .select('spotify_id, url_spotify_web, url_spotify_app')
      .eq('spotify_id', providerTrackId)
      .single();
    
    if (data) {
      return {
        provider: 'spotify',
        provider_track_id: data.spotify_id || providerTrackId,
        url_web: data.url_spotify_web || `https://open.spotify.com/track/${providerTrackId}`,
        url_app: data.url_spotify_app || `spotify:track:${providerTrackId}`,
      };
    }

    // Fallback to generated URLs
    return {
      provider: 'spotify',
      provider_track_id: providerTrackId,
      url_web: `https://open.spotify.com/track/${providerTrackId}`,
      url_app: `spotify:track:${providerTrackId}`,
    };
  }

  async checkHealth(): Promise<boolean> {
    // Check if we can connect to Supabase
    try {
      const { error } = await supabase.from('tracks').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
