import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackCard } from '@/components/TrackCard';
import { FeedSkeleton } from '@/components/FeedSkeleton';
import { BottomNav } from '@/components/BottomNav';
import { useFeed, useToggleInteraction, useUserInteractions } from '@/hooks/api/useFeed';
import { useAuth } from '@/hooks/useAuth';
import { InteractionType } from '@/types';
import { ChevronUp, ChevronDown, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: tracks = [], isLoading: feedLoading } = useFeed();
  const { data: userInteractions } = useUserInteractions(user?.id);
  const toggleInteraction = useToggleInteraction();
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loading = authLoading || feedLoading;

  // Reset to first track whenever feed reloads to avoid stale index blocking first swipe
  useEffect(() => {
    setCurrentIndex(0);
  }, [tracks.length]);

  const handleInteraction = async (type: InteractionType) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const track = tracks[currentIndex];
    if (!track) return;

    try {
      const result = await toggleInteraction.mutateAsync({
        trackId: track.id,
        interactionType: type as any,
        userId: user.id,
      });

      if (result.action === 'added') {
        toast.success(`${type === 'like' ? 'Liked' : type === 'save' ? 'Saved' : 'Added'} track`);
      }

      // Auto-advance on skip
      if (type === 'skip' && currentIndex < tracks.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle interaction:', error);
      toast.error('Failed to save interaction');
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <FeedSkeleton />
        <BottomNav />
      </div>
    );
  }

  const currentTrack = tracks[currentIndex];
  const trackInteractions = currentTrack
    ? new Set([
        ...(userInteractions?.likes.has(currentTrack.id) ? ['like' as InteractionType] : []),
        ...(userInteractions?.saves.has(currentTrack.id) ? ['save' as InteractionType] : []),
      ])
    : new Set<InteractionType>();

  return (
    <div className="min-h-screen bg-background flex" ref={containerRef}>
      {/* Side navigation - Desktop only */}
      <div className="hidden lg:block">
        <BottomNav />
      </div>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 lg:left-20 z-40 glass-strong safe-top">
          <div className="flex items-center justify-between px-4 py-3 max-w-4xl lg:mx-auto">
            <h1 className="text-lg lg:text-xl font-bold gradient-text">HarmonyFeed</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs lg:text-sm text-muted-foreground">
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
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Navigation arrows (desktop) */}
        <div className="hidden md:flex fixed left-4 lg:left-24 top-1/2 -translate-y-1/2 z-30 flex-col gap-2">
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
        <main className="flex-1 pt-16 pb-24 lg:pb-8">
          <div className="h-[calc(100vh-10rem)] lg:h-[calc(100vh-6rem)] max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-4 lg:px-8">
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
                    interactions={trackInteractions}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
