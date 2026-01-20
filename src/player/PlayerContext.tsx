import { createContext, useContext, useMemo, useState, useCallback, ReactNode } from 'react';
import { recordPlayEvent } from '@/api/playEvents';
import { MusicProvider } from '@/types';
import { getPreferredProvider } from '@/lib/preferences';

export interface ConnectedProviders {
  spotify?: { connected: boolean; premium: boolean };
}

export interface PlayerState {
  open: boolean;
  canonicalTrackId: string | null;
  provider: MusicProvider;
  providerTrackId: string | null;
  autoplay: boolean;
  /** Start time in seconds for seeking (e.g., section navigation) */
  seekToSec: number | null;
}

type OpenPlayerPayload = {
  canonicalTrackId: string | null;
  provider: MusicProvider;
  providerTrackId: string | null;
  autoplay?: boolean;
  context?: string;
  /** Optional start time in seconds */
  startSec?: number;
};

interface PlayerContextValue extends PlayerState {
  openPlayer: (payload: OpenPlayerPayload) => void;
  closePlayer: () => void;
  switchProvider: (provider: MusicProvider, providerTrackId: string | null, canonicalTrackId?: string | null) => void;
  /** Seek to a specific time (seconds). Used for section navigation. */
  seekTo: (sec: number) => void;
  /** Clear seekToSec after the player has performed the seek */
  clearSeek: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>({
    open: false,
    canonicalTrackId: null,
    provider: 'youtube',
    providerTrackId: null,
    autoplay: false,
    seekToSec: null,
  });

  const seekTo = useCallback((sec: number) => {
    setState((prev) => ({ ...prev, seekToSec: sec }));
  }, []);

  const clearSeek = useCallback(() => {
    setState((prev) => ({ ...prev, seekToSec: null }));
  }, []);

  const value = useMemo<PlayerContextValue>(() => ({
    ...state,
    seekTo,
    clearSeek,
    openPlayer: (payload) => {
      setState((prev) => ({
        open: true,
        canonicalTrackId: payload.canonicalTrackId ?? prev.canonicalTrackId,
        provider: payload.provider,
        providerTrackId: payload.providerTrackId,
        autoplay: payload.autoplay ?? true,
        seekToSec: payload.startSec ?? null,
      }));

      if (payload.canonicalTrackId) {
        recordPlayEvent({
          track_id: payload.canonicalTrackId,
          provider: payload.provider,
          action: 'preview',
          context: payload.context ?? 'player',
        }).catch((err) => {
          console.error('Failed to record play event', err);
        });
      }
    },
    closePlayer: () => setState((prev) => ({ ...prev, open: false, autoplay: false, seekToSec: null })),
    switchProvider: (provider, providerTrackId, canonicalTrackId) => {
      setState((prev) => ({
        ...prev,
        provider,
        providerTrackId,
        canonicalTrackId: canonicalTrackId ?? prev.canonicalTrackId,
        open: true,
        autoplay: true,
        seekToSec: null,
      }));

      const trackIdToLog = canonicalTrackId ?? state.canonicalTrackId;
      if (trackIdToLog) {
        recordPlayEvent({
          track_id: trackIdToLog,
          provider,
          action: 'preview',
          context: 'provider-switch',
        }).catch((err) => {
          console.error('Failed to record provider switch event', err);
        });
      }
    },
  }), [state, seekTo, clearSeek]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function resolveDefaultProvider(connected: ConnectedProviders): MusicProvider {
  // First check user's preferred provider from localStorage
  const preferred = getPreferredProvider();
  if (preferred && preferred !== 'none') {
    // If user prefers Spotify, check if it's connected
    if (preferred === 'spotify' && connected?.spotify?.connected) {
      return 'spotify';
    }
    // For other providers, use the preference if it's valid
    if (preferred === 'youtube' || preferred === 'apple_music') {
      return preferred as MusicProvider;
    }
  }
  
  // Fallback: if Spotify is connected, use it
  if (connected?.spotify?.connected) return 'spotify';
  
  // Default to YouTube
  return 'youtube';
}
