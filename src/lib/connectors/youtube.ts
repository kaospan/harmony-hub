/**
 * YouTube API Connector
 * Implements unified search and link resolution for YouTube Music
 */

import {
  ProviderConnector,
  NormalizedTrack,
  SearchOptions,
  searchWithTimeout,
} from './base';
import { ProviderLink } from '@/types';

interface YouTubeSearchResult {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
  };
  contentDetails: {
    duration: string; // ISO 8601 format (PT4M33S)
  };
}

export class YouTubeConnector implements ProviderConnector {
  readonly name = 'youtube' as const;
  readonly enabled: boolean;

  constructor(private apiKey?: string) {
    this.enabled = !!apiKey;
  }

  async searchTracks(options: SearchOptions): Promise<NormalizedTrack[]> {
    const { query, limit = 10, timeout = 5000 } = options;

    const searchPromise = this.performSearch(query, limit);
    const results = await searchWithTimeout(searchPromise, timeout, 'YouTube');

    return results;
  }

  private async performSearch(query: string, limit: number): Promise<NormalizedTrack[]> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    // Search for music videos/tracks
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10', // Music category
      maxResults: limit.toString(),
      key: this.apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`
    );

    if (!response.ok) {
      throw new Error(`YouTube search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const items: YouTubeSearchResult[] = data.items || [];

    // Get video details for duration
    const videoIds = items.map(item => item.id.videoId).join(',');
    const details = await this.getVideoDetails(videoIds);

    return items.map((item, index) => this.normalizeTrack(item, details[index]));
  }

  private async getVideoDetails(videoIds: string): Promise<YouTubeVideoDetails[]> {
    if (!this.apiKey || !videoIds) return [];

    const params = new URLSearchParams({
      part: 'contentDetails,snippet',
      id: videoIds,
      key: this.apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.items || [];
  }

  private normalizeTrack(
    searchResult: YouTubeSearchResult,
    details?: YouTubeVideoDetails
  ): NormalizedTrack {
    const videoId = searchResult.id.videoId;
    
    // Parse title to extract track name and artist
    // Format is often: "Artist - Track Name" or "Track Name - Artist"
    const fullTitle = searchResult.snippet.title;
    const parts = fullTitle.split('-').map(p => p.trim());
    
    let title = fullTitle;
    let artists = [searchResult.snippet.channelTitle];
    
    if (parts.length === 2) {
      // Assume "Artist - Track" format
      title = parts[1];
      artists = [parts[0]];
    } else if (parts.length > 2) {
      // Take last part as title, rest as artist
      title = parts[parts.length - 1];
      artists = [parts.slice(0, -1).join(' - ')];
    }

    // Get thumbnail
    const thumbnails = searchResult.snippet.thumbnails;
    const artwork_url = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;

    // Parse duration from ISO 8601 (PT4M33S -> milliseconds)
    let duration_ms: number | undefined;
    if (details?.contentDetails.duration) {
      duration_ms = this.parseDuration(details.contentDetails.duration);
    }

    return {
      title,
      artists,
      duration_ms,
      artwork_url,
      provider_track_id: videoId,
      provider: 'youtube',
      url_web: `https://www.youtube.com/watch?v=${videoId}`,
      url_app: `vnd.youtube://watch?v=${videoId}`,
      url_preview: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  /**
   * Parse ISO 8601 duration (PT4M33S) to milliseconds
   */
  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
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
    if (!this.apiKey) return false;

    try {
      // Simple test query
      const params = new URLSearchParams({
        part: 'snippet',
        q: 'test',
        type: 'video',
        maxResults: '1',
        key: this.apiKey,
      });

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params}`
      );

      return response.ok;
    } catch (error) {
      console.error('YouTube health check failed:', error);
      return false;
    }
  }
}
