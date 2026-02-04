/**
 * YouTube API Connector
 * Implements unified search and link resolution for YouTube Music
 * 
 * SECURITY: All YouTube API calls are proxied through Edge Function
 * The API key is stored server-side and never exposed to clients
 */

import {
  ProviderConnector,
  NormalizedTrack,
  SearchOptions,
  searchWithTimeout,
} from './base';
import { ProviderLink } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export class YouTubeConnector implements ProviderConnector {
  readonly name = 'youtube' as const;
  readonly enabled: boolean = true; // Always enabled - uses Edge Function

  constructor() {
    // No API key needed client-side - all calls go through Edge Function
  }

  async searchTracks(options: SearchOptions): Promise<NormalizedTrack[]> {
    const { query, limit = 10, timeout = 5000 } = options;

    const searchPromise = this.performSearch(query, limit);
    const results = await searchWithTimeout(searchPromise, timeout, 'YouTube');

    return results;
  }

  /**
   * Search using Supabase Edge Function (server-side YouTube API)
   * Requires authenticated user
   */
  private async performSearch(query: string, limit: number): Promise<NormalizedTrack[]> {
    try {
      // Check if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session) {
        console.log('YouTube search requires authentication');
        return [];
      }

      // Call Edge Function for YouTube search
      const { data, error } = await supabase.functions.invoke('search_youtube', {
        body: { query, limit },
      });

      if (error) {
        console.error('YouTube Edge Function error:', error);
        return [];
      }

      if (!data?.results) {
        return [];
      }

      return data.results as NormalizedTrack[];
    } catch (error) {
      console.error('YouTube search failed:', error);
      return [];
    }
  }

  async resolveLinks(providerTrackId: string): Promise<ProviderLink> {
    return {
      provider: 'youtube',
      provider_track_id: providerTrackId,
      url_web: `https://www.youtube.com/watch?v=${providerTrackId}`,
      url_app: `vnd.youtube://watch?v=${providerTrackId}`,
      url_preview: `https://www.youtube.com/watch?v=${providerTrackId}`,
    };
  }

  async checkHealth(): Promise<boolean> {
    // Check if user is authenticated (required for YouTube search)
    try {
      const { data: session } = await supabase.auth.getSession();
      return !!session?.session;
    } catch {
      return false;
    }
  }
}
