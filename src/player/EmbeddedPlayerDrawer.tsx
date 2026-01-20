import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import { YouTubePlayer } from './providers/YouTubePlayer';
import { SpotifyEmbedPreview } from './providers/SpotifyEmbedPreview';

const providerMeta = {
  spotify: { label: 'Spotify', badge: '🎧' },
  youtube: { label: 'YouTube', badge: '▶' },
} as const;

export function EmbeddedPlayerDrawer() {
  const { open, provider, providerTrackId, autoplay, closePlayer } = usePlayer();
  const [isMinimized, setIsMinimized] = useState(false);

  const meta = useMemo(() => {
    return provider ? providerMeta[provider as keyof typeof providerMeta] ?? { label: 'Now Playing', badge: '♪' } : { label: 'Now Playing', badge: '♪' };
  }, [provider]);

  const renderPlayer = () => {
    if (provider === 'spotify') {
      return <SpotifyEmbedPreview providerTrackId={providerTrackId} autoplay={autoplay} />;
    }
    return <YouTubePlayer providerTrackId={providerTrackId} autoplay={autoplay} />;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="player-drawer"
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-4 pb-6"
        >
          <div className="pointer-events-auto mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-lg">{meta.badge}</span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Now Playing</span>
                    <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMinimized((prev) => !prev)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                    aria-label={isMinimized ? 'Expand player' : 'Minimize player'}
                  >
                    {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMinimized(false);
                      closePlayer();
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                    aria-label="Close player"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-4">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </div>

              <AnimatePresence initial={false}>
                {!isMinimized && (
                  <motion.div
                    key="player-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="px-4 pb-4"
                  >
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/50">
                      {renderPlayer()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
