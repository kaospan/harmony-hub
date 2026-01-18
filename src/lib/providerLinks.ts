import { MusicProvider } from '@/types';
import { toast } from 'sonner';

export interface ProviderLinkData {
  provider: MusicProvider;
  provider_track_id: string;
  url_web?: string;
  url_app?: string;
  url_preview?: string;
}

/**
 * Open a music provider link
 * Tries app deep link first, then falls back to web URL
 */
export function openProviderLink(
  link: ProviderLinkData,
  preferApp: boolean = true
): void {
  const { provider, url_app, url_web, provider_track_id } = link;

  // Try app URL first if preferred and available
  if (preferApp && url_app) {
    try {
      // Try to open app deep link
      window.location.href = url_app;
      
      // Set timeout to fallback to web if app doesn't open
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          // App didn't open, fallback to web
          if (url_web) {
            window.open(url_web, '_blank', 'noopener,noreferrer');
          } else {
            toast.error(`No web link available for ${formatProviderName(provider)}`);
          }
        }
      }, 1500);
      
      return;
    } catch (error) {
      console.warn(`Failed to open ${provider} app:`, error);
    }
  }

  // Fallback to web URL
  if (url_web) {
    window.open(url_web, '_blank', 'noopener,noreferrer');
    return;
  }

  // Generate fallback URLs if neither is available
  const fallbackUrl = generateFallbackUrl(provider, provider_track_id);
  if (fallbackUrl) {
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // No link available
  toast.error(`No link available for ${formatProviderName(provider)}`);
}

/**
 * Generate a fallback URL for a provider
 */
function generateFallbackUrl(provider: MusicProvider, trackId: string): string | null {
  switch (provider) {
    case 'spotify':
      return `https://open.spotify.com/track/${trackId}`;
    case 'youtube':
      return `https://www.youtube.com/watch?v=${trackId}`;
    case 'apple_music':
      return `https://music.apple.com/us/song/${trackId}`;
    case 'deezer':
      return `https://www.deezer.com/track/${trackId}`;
    case 'soundcloud':
      return `https://soundcloud.com/${trackId}`;
    case 'amazon_music':
      return `https://music.amazon.com/albums/${trackId}`;
    default:
      return null;
  }
}

/**
 * Format provider name for display
 */
export function formatProviderName(provider: MusicProvider): string {
  switch (provider) {
    case 'spotify':
      return 'Spotify';
    case 'youtube':
      return 'YouTube Music';
    case 'apple_music':
      return 'Apple Music';
    case 'deezer':
      return 'Deezer';
    case 'soundcloud':
      return 'SoundCloud';
    case 'amazon_music':
      return 'Amazon Music';
    default:
      return provider;
  }
}

/**
 * Get provider icon/color for UI
 */
export function getProviderStyle(provider: MusicProvider): { icon: string; color: string } {
  switch (provider) {
    case 'spotify':
      return { icon: '🎵', color: '#1DB954' };
    case 'youtube':
      return { icon: '▶️', color: '#FF0000' };
    case 'apple_music':
      return { icon: '🍎', color: '#FA243C' };
    case 'deezer':
      return { icon: '🎧', color: '#FF0092' };
    case 'soundcloud':
      return { icon: '☁️', color: '#FF5500' };
    case 'amazon_music':
      return { icon: '🛒', color: '#00A8E1' };
    default:
      return { icon: '🎵', color: '#888888' };
  }
}
