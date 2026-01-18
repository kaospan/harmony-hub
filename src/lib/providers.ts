// Music provider utilities and link generation

import { Track, ProviderLink as TrackProviderLink } from '@/types';
import { toast } from 'sonner';

export type MusicProvider = 'spotify' | 'youtube' | 'apple_music' | 'deezer' | 'soundcloud' | 'amazon_music';

export interface ProviderLink {
  provider: MusicProvider;
  name: string;
  icon: string;
  webUrl: string;
  appUrl?: string;
  color: string;
  trackId: string;
}

export interface TrackProviderInfo {
  spotifyId?: string;
  youtubeId?: string;
  urlSpotifyWeb?: string;
  urlSpotifyApp?: string;
  urlYoutube?: string;
  appleMusicId?: string;
  deezerId?: string;
  soundcloudId?: string;
  amazonMusicId?: string;
  providerLinks?: TrackProviderLink[];
}

// Generate Spotify URLs from track ID
export function generateSpotifyLinks(spotifyId: string): { web: string; app: string } {
  return {
    web: `https://open.spotify.com/track/${spotifyId}`,
    app: `spotify:track:${spotifyId}`,
  };
}

// Generate YouTube URL from video ID
export function generateYoutubeLink(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

// Get all available provider links for a track
export function getProviderLinks(track: TrackProviderInfo | Track): ProviderLink[] {
  const links: ProviderLink[] = [];

  // Try to use providerLinks array first (from database)
  if ('providerLinks' in track && track.providerLinks && track.providerLinks.length > 0) {
    return track.providerLinks.map((link) => {
      const providerInfo = PROVIDER_INFO[link.provider];
      return {
        provider: link.provider,
        name: providerInfo.name,
        icon: providerInfo.icon,
        webUrl: link.url_web || '',
        appUrl: link.url_app,
        color: providerInfo.color,
        trackId: link.provider_track_id,
      };
    }).filter((link) => link.webUrl || link.appUrl);
  }

  // Fallback to legacy fields
  if (track.spotifyId || track.urlSpotifyWeb) {
    const spotifyLinks = track.spotifyId 
      ? generateSpotifyLinks(track.spotifyId)
      : { web: track.urlSpotifyWeb!, app: track.urlSpotifyApp };
    
    links.push({
      provider: 'spotify',
      name: 'Spotify',
      icon: '🎵',
      webUrl: spotifyLinks.web,
      appUrl: spotifyLinks.app,
      color: '#1DB954',
      trackId: track.spotifyId || '',
    });
  }

  if (track.youtubeId || track.urlYoutube) {
    const youtubeUrl = track.youtubeId 
      ? generateYoutubeLink(track.youtubeId) 
      : track.urlYoutube!;
    
    links.push({
      provider: 'youtube',
      name: 'YouTube (Free)',
      icon: '▶️',
      webUrl: youtubeUrl,
      color: '#FF0000',
      trackId: track.youtubeId || '',
    });
  }

  return links;
}

// Open provider link (tries app first, falls back to web)
export function openProviderLink(link: ProviderLink, preferApp = true): void {
  if (preferApp && link.appUrl) {
    // Try to open app
    try {
      window.location.href = link.appUrl;
      
      // Set timeout to fallback to web if app doesn't open
      setTimeout(() => {
        if (document.visibilityState === 'visible' && link.webUrl) {
          // App didn't open, fallback to web
          window.open(link.webUrl, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
      
      return;
    } catch (error) {
      console.warn(`Failed to open ${link.provider} app:`, error);
    }
  }
  
  // Fallback to web URL
  if (link.webUrl) {
    window.open(link.webUrl, '_blank', 'noopener,noreferrer');
  } else {
    toast.error(`No link available for ${link.name}`);
  }
}

// Provider display info
export const PROVIDER_INFO: Record<MusicProvider, { name: string; icon: string; color: string }> = {
  spotify: { name: 'Spotify', icon: '🎵', color: '#1DB954' },
  youtube: { name: 'YouTube', icon: '▶️', color: '#FF0000' },
  apple_music: { name: 'Apple Music', icon: '🍎', color: '#FA243C' },
  deezer: { name: 'Deezer', icon: '🎧', color: '#FF6600' },
  soundcloud: { name: 'SoundCloud', icon: '☁️', color: '#FF5500' },
  amazon_music: { name: 'Amazon Music', icon: '📦', color: '#00A8E1' },
};
