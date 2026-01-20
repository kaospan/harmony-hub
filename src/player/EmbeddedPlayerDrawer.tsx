import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import { YouTubePlayer } from './providers/YouTubePlayer';
import { SpotifyEmbedPreview } from './providers/SpotifyEmbedPreview';

const providerMeta = {
  spotify: { label: 'Spotify', badge: '🎧', color: 'from-green-500/20 to-green-600/10' },
  youtube: { label: 'YouTube', badge: '▶', color: 'from-red-500/20 to-red-600/10' },
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
          <div className="pointer-events-auto mx-auto max-w-md lg:max-w-lg">
            <div className={`overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${(meta as any).color || 'from-primary/10 to-background'} shadow-2xl backdrop-blur-xl`}>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-background/60">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-xl shadow-inner">{meta.badge}</span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Now Playing</span>
                    <span className="text-sm font-bold text-foreground">{meta.label}</span>
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

              <AnimatePresence initial={false}>
                {!isMinimized && (
                  <motion.div
                    key="player-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="px-3 pb-3"
                  >
                    <div className="overflow-hidden rounded-xl">
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
