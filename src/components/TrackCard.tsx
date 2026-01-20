import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bookmark, X, Sparkles, Waves, Play, ChevronDown, Youtube, Music } from 'lucide-react';
import { HarmonyCard } from './HarmonyCard';
import { CommentsSheet } from './CommentsSheet';
import { NearbyListenersSheet } from './NearbyListenersSheet';
import { ShareSheet } from './ShareSheet';
import { StreamingLinks } from './StreamingLinks';
import { TrackSections } from './TrackSections';
import { Button } from '@/components/ui/button';
import { Track, InteractionType, MusicProvider } from '@/types';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useConnectedProviders } from '@/hooks/api/useConnectedProviders';
import { usePlayer, resolveDefaultProvider } from '@/player/PlayerContext';

interface TrackCardProps {
  track: Track;
  isActive: boolean;
  onInteraction: (type: InteractionType) => void;
  interactions?: Set<InteractionType>;
}

export function TrackCard({ track, isActive, onInteraction, interactions = new Set() }: TrackCardProps) {
  const connectedProviders = useConnectedProviders();
  const { openPlayer, switchProvider, open: playerOpen, providerTrackId: activeProviderTrackId } = usePlayer();
  const [showStreamingLinks, setShowStreamingLinks] = useState(false);
  const [showVideoBackground, setShowVideoBackground] = useState(false);

  const providerMap = useMemo(() => {
    const map: Record<MusicProvider, string | undefined> = {} as any;
    track.providerLinks?.forEach((l) => {
      map[l.provider as MusicProvider] = l.provider_track_id;
    });
    if (track.spotify_id) map.spotify = track.spotify_id;
    if (track.youtube_id) map.youtube = track.youtube_id;
    return map;
  }, [track.providerLinks, track.spotify_id, track.youtube_id]);

  const defaultProvider = useMemo(
    () => resolveDefaultProvider(connectedProviders),
    [connectedProviders]
  );

  // Check if YouTube background video is currently playing for this track
  const isVideoActive = showVideoBackground && playerOpen && activeProviderTrackId === track.youtube_id;

  const providerButtons: Array<{ key: MusicProvider; label: string; color: string; icon: string }> = [
    { key: 'spotify', label: 'Spotify', color: '#1DB954', icon: '🎧' },
    { key: 'youtube', label: 'YouTube', color: '#FF0000', icon: '▶️' },
    { key: 'apple_music', label: 'Apple', color: '#FA243C', icon: '🍎' },
    { key: 'amazon_music', label: 'Amazon', color: '#FF9900', icon: '🛒' },
    { key: 'deezer', label: 'Deezer', color: '#FEAA2D', icon: '🎵' },
  ];

  // WATCH button: Show YouTube as background video
  const handleWatch = () => {
    if (!track.youtube_id) return;
    setShowVideoBackground(true);
    openPlayer({
      canonicalTrackId: track.id,
      provider: 'youtube',
      providerTrackId: track.youtube_id,
      autoplay: true,
      context: 'watch-background',
    });
  };

  // LISTEN button: Use default provider (Spotify if connected, else YouTube in drawer)
  const handleListen = () => {
    const provider = defaultProvider;
    const providerTrackId = providerMap[provider];
    
    // For Spotify, try to open in native app (best effort, focus may shift)
    if (provider === 'spotify' && track.url_spotify_app) {
      // Attempt native app via URI - browser will handle
      window.location.href = track.url_spotify_app;
      return;
    }

    // Otherwise use embedded player
    openPlayer({
      canonicalTrackId: track.id,
      provider,
      providerTrackId: providerTrackId ?? null,
      autoplay: true,
      context: 'listen',
    });
  };

  const handleProviderSwitch = (provider: MusicProvider) => {
    const providerTrackId = providerMap[provider] ?? null;
    
    // For Spotify, try native app
    if (provider === 'spotify' && track.url_spotify_app) {
      window.location.href = track.url_spotify_app;
      return;
    }
    
    switchProvider(provider, providerTrackId, track.id);
  };

  const handleShare = () => onInteraction('share');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0.5 }}
      className="relative w-full h-full flex flex-col lg:flex-row"
    >
      {/* Background: YouTube video when Watch is active, otherwise cover art */}
      <div className="absolute inset-0 lg:relative lg:w-1/2 lg:rounded-3xl lg:overflow-hidden z-0">
        {isVideoActive && track.youtube_id ? (
          <>
            {/* YouTube embed as background */}
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${track.youtube_id}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&enablejsapi=1&loop=1&playlist=${track.youtube_id}`}
              className="w-full h-full object-cover pointer-events-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`${track.title} - Background Video`}
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-background via-background/60 to-transparent pointer-events-none" />
          </>
        ) : track.cover_url ? (
          <>
            <img
              src={track.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-background via-background/80 to-background/40" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-background" />
        )}
      </div>

      {/* Content - Desktop right side */}
      <div className="relative z-10 flex-1 flex flex-col justify-end lg:justify-center p-6 lg:p-8 pb-8 space-y-4 lg:space-y-6">
        {/* Track info */}
        <div className="space-y-2">
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl lg:text-4xl xl:text-5xl font-bold text-foreground line-clamp-2"
          >
            {track.title}
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-lg lg:text-xl xl:text-2xl text-muted-foreground"
          >
            {track.artist}
          </motion.p>
        </div>

        {/* Watch + Listen buttons and provider icons */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 flex-wrap"
        >
          {/* WATCH button - YouTube video as background */}
          {track.youtube_id && (
            <Button
              variant={isVideoActive ? 'default' : 'outline'}
              size="lg"
              onClick={handleWatch}
              className={cn(
                'gap-2 text-sm lg:text-base',
                isVideoActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'glass border-white/20 hover:bg-white/10'
              )}
            >
              <Youtube className="w-5 h-5 lg:w-6 lg:h-6" />
              Watch
            </Button>
          )}

          {/* LISTEN button - default provider */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleListen}
            className="gap-2 glass border-white/20 hover:bg-white/10 text-sm lg:text-base"
          >
            <Music className="w-5 h-5 lg:w-6 lg:h-6" />
            Listen
          </Button>

          {/* Provider switch icons */}
          <div className="flex items-center gap-2">
            {providerButtons.map((p) => {
              const available = !!providerMap[p.key];
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => available && handleProviderSwitch(p.key)}
                  disabled={!available}
                  className={cn(
                    'h-10 w-10 rounded-full border border-white/20 flex items-center justify-center text-sm transition-all',
                    available ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
                  )}
                  style={{ color: available ? p.color : undefined }}
                  aria-label={`Play on ${p.label}`}
                  title={available ? `Play on ${p.label}` : `${p.label} not available`}
                >
                  {p.icon}
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="glass border-white/20 hover:bg-white/10 lg:h-11 lg:w-11"
            onClick={() => setShowStreamingLinks(!showStreamingLinks)}
          >
            <ChevronDown className={cn('w-5 h-5 lg:w-6 lg:h-6 transition-transform', showStreamingLinks && 'rotate-180')} />
          </Button>
        </motion.div>

        {/* Streaming Links Dropdown */}
        <AnimatePresence>
          {showStreamingLinks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="py-2">
                <StreamingLinks
                  track={{
                    spotifyId: track.spotify_id || undefined,
                    youtubeId: track.youtube_id || undefined,
                    urlSpotifyWeb: track.url_spotify_web || undefined,
                    urlSpotifyApp: track.url_spotify_app || undefined,
                    urlYoutube: track.url_youtube || undefined,
                    providerLinks: track.providerLinks,
                  }}
                  defaultProvider={defaultProvider}
                  trackId={track.id}
                  compact
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Song Sections - navigate to intro, verse, chorus, etc. */}
        {track.sections && track.sections.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            <TrackSections sections={track.sections} />
          </motion.div>
        )}

        {/* Harmony card */}
        {track.progression_roman && track.progression_roman.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <HarmonyCard
              progression={track.progression_roman}
              detectedKey={track.detected_key}
              detectedMode={track.detected_mode}
              cadenceType={track.cadence_type}
              confidenceScore={track.confidence_score}
              matchReason="Same vi–IV–I–V loop with similar energy"
            />
          </motion.div>
        )}

        {/* Main action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between lg:justify-start lg:gap-4 pt-4"
        >
          {/* Skip */}
          <ActionButton
            icon={X}
            label="Skip"
            isActive={interactions.has('skip')}
            onClick={() => onInteraction('skip')}
            variant="muted"
          />

          {/* More like this (harmonic) */}
          <ActionButton
            icon={Sparkles}
            label="Harmonic"
            isActive={interactions.has('more_harmonic')}
            onClick={() => onInteraction('more_harmonic')}
            variant="primary"
          />

          {/* Like */}
          <ActionButton
            icon={Heart}
            label="Like"
            isActive={interactions.has('like')}
            onClick={() => onInteraction('like')}
            variant="accent"
          />

          {/* More like this (vibe) */}
          <ActionButton
            icon={Waves}
            label="Vibe"
            isActive={interactions.has('more_vibe')}
            onClick={() => onInteraction('more_vibe')}
            variant="primary"
          />

          {/* Save */}
          <ActionButton
            icon={Bookmark}
            label="Save"
            isActive={interactions.has('save')}
            onClick={() => onInteraction('save')}
            variant="muted"
          />
        </motion.div>

        {/* Secondary actions: Comments, Nearby, Share */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-4"
        >
          {/* Comments */}
          <CommentsSheet trackId={track.id} trackTitle={track.title} />

          {/* Nearby Listeners */}
          <NearbyListenersSheet 
            trackId={track.id} 
            artist={track.artist} 
            trackTitle={track.title}
          />

          {/* Share */}
          <ShareSheet track={track} onShare={handleShare} />
        </motion.div>
      </div>
    </motion.div>
  );
}

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  variant: 'primary' | 'accent' | 'muted';
}

function ActionButton({ icon: Icon, label, isActive, onClick, variant }: ActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-3 rounded-xl transition-all',
        isActive && variant === 'accent' && 'text-accent glow-accent',
        isActive && variant === 'primary' && 'text-primary glow-primary',
        isActive && variant === 'muted' && 'text-foreground',
        !isActive && 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div
        className={cn(
          'p-3 rounded-full transition-all',
          isActive && variant === 'accent' && 'bg-accent/20',
          isActive && variant === 'primary' && 'bg-primary/20',
          isActive && variant === 'muted' && 'bg-muted',
          !isActive && 'bg-muted/50 hover:bg-muted'
        )}
      >
        <Icon className={cn('w-6 h-6', isActive && variant === 'accent' && 'fill-current')} />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </motion.button>
  );
}
