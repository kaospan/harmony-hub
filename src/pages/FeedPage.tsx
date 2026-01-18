import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackCard } from '@/components/TrackCard';
import { FeedSkeleton } from '@/components/FeedSkeleton';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { InteractionType, Track } from '@/types';
import { ChevronUp, ChevronDown, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useFeedTracks } from '@/hooks/api/useTracks';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: tracks = [], isLoading: tracksLoading } = useFeedTracks();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interactions, setInteractions] = useState<Map<string, Set<InteractionType>>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInteraction = (type: InteractionType) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const trackId = tracks[currentIndex]?.id;
    if (!trackId) return;

    setInteractions((prev) => {
      const next = new Map(prev);
      const trackInteractions = new Set(prev.get(trackId) || []);

      if (trackInteractions.has(type)) {
        trackInteractions.delete(type);
      } else {
        trackInteractions.add(type);
      }

      next.set(trackId, trackInteractions);
      return next;
    });

    // Auto-advance on skip
    if (type === 'skip' && currentIndex < tracks.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < tracks.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  // Handle touch/scroll with improved swipe detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let startX = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isDragging = true;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return;
      isDragging = false;

      const endY = e.changedTouches[0].clientY;
      const endX = e.changedTouches[0].clientX;
      const diffY = startY - endY;
      const diffX = startX - endX;

      // Only trigger vertical swipe if vertical movement > horizontal
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 50) {
        if (diffY > 0) {
          goToNext();
        } else {
          goToPrevious();
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentIndex]);

  if (authLoading || tracksLoading) {
    return (
      <div className="min-h-screen bg-background">
        <FeedSkeleton />
        <BottomNav />
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-40 glass-strong safe-top">
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <h1 className="text-lg font-bold gradient-text">HarmonyFeed</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">No tracks available in feed.</p>
            <p className="text-sm text-muted-foreground">Please run the seed script to populate data.</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const currentTrack = tracks[currentIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col" ref={containerRef}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-strong safe-top">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <h1 className="text-lg font-bold gradient-text">HarmonyFeed</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {tracks.length}
            </span>
            {!user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation arrows (desktop) */}
      <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          className="glass"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="glass"
          onClick={goToNext}
          disabled={currentIndex === tracks.length - 1}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>

      {/* Feed content */}
      <main className="flex-1 pt-16 pb-24">
        <div className="h-[calc(100vh-10rem)] max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {currentTrack && (
              <motion.div
                key={currentTrack.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <TrackCard
                  track={currentTrack}
                  isActive={true}
                  onInteraction={handleInteraction}
                  interactions={interactions.get(currentTrack.id) || new Set()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
