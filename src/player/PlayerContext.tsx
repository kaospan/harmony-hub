import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { recordPlayEvent } from '@/api/playEvents';
import { MusicProvider } from '@/types';

export interface ConnectedProviders {
  spotify?: { connected: boolean; premium: boolean };
}

export interface PlayerState {
  open: boolean;
  canonicalTrackId: string | null;
  provider: MusicProvider;
  providerTrackId: string | null;
  autoplay: boolean;
}

type OpenPlayerPayload = {
  canonicalTrackId: string | null;
  provider: MusicProvider;
  providerTrackId: string | null;
  autoplay?: boolean;
  context?: string;
};

interface PlayerContextValue extends PlayerState {
  openPlayer: (payload: OpenPlayerPayload) => void;
  closePlayer: () => void;
  switchProvider: (provider: MusicProvider, providerTrackId: string | null, canonicalTrackId?: string | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>({
    open: false,
    canonicalTrackId: null,
    provider: 'youtube',
    providerTrackId: null,
    autoplay: false,
  });

  const value = useMemo<PlayerContextValue>(() => ({
    ...state,
    openPlayer: (payload) => {
      setState((prev) => ({
        open: true,
        canonicalTrackId: payload.canonicalTrackId ?? prev.canonicalTrackId,
        provider: payload.provider,
        providerTrackId: payload.providerTrackId,
        autoplay: payload.autoplay ?? true,
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
    closePlayer: () => setState((prev) => ({ ...prev, open: false, autoplay: false })),
    switchProvider: (provider, providerTrackId, canonicalTrackId) => {
      setState((prev) => ({
        ...prev,
        provider,
        providerTrackId,
        canonicalTrackId: canonicalTrackId ?? prev.canonicalTrackId,
        open: true,
        autoplay: true,
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
  }), [state]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function resolveDefaultProvider(connected: ConnectedProviders): MusicProvider {
  if (connected?.spotify?.connected) return 'spotify';
  return 'youtube';
}
