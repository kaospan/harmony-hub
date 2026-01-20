import { useEffect, useMemo, useRef } from 'react';
import { usePlayer } from '../PlayerContext';

interface YouTubePlayerProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

const ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

/**
 * Seekable YouTube player using iframe postMessage API.
 * Supports section navigation via seekToSec from PlayerContext.
 */
export function YouTubePlayer({ providerTrackId, autoplay }: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { seekToSec, clearSeek } = usePlayer();

  const src = useMemo(() => {
    if (!providerTrackId) return null;
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      modestbranding: '1',
      rel: '0',
      enablejsapi: '1',
      origin: window.location.origin,
    });
    // Use the privacy-enhanced domain to reduce cookie usage
    return `https://www.youtube-nocookie.com/embed/${providerTrackId}?${params.toString()}`;
  }, [providerTrackId, autoplay]);

  // Handle seek requests from context
  useEffect(() => {
    if (seekToSec !== null && iframeRef.current?.contentWindow) {
      // YouTube iframe API expects a JSON command via postMessage
      const command = JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seekToSec, true],
      });
      iframeRef.current.contentWindow.postMessage(command, '*');
      clearSeek();
    }
  }, [seekToSec, clearSeek]);

  if (!src) return null;

  return (
    <div className="w-full h-20 bg-gradient-to-r from-red-950/80 via-black to-red-950/80 rounded-xl overflow-hidden relative">
      {/* Hidden iframe - YouTube requires video element but we only need audio */}
      <iframe
        ref={iframeRef}
        className="absolute -top-[1000px] w-1 h-1 opacity-0 pointer-events-none"
        src={src}
        allow={ALLOW}
        title="YouTube audio player"
      />
      {/* Audio-only visual indicator */}
      <div className="w-full h-full flex items-center justify-center gap-3 px-4">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full animate-pulse"
              style={{
                height: `${12 + Math.random() * 20}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg">▶</span>
            <span className="text-sm font-medium text-white truncate">Playing via YouTube</span>
          </div>
          <p className="text-xs text-white/60">Audio streaming in background</p>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full animate-pulse"
              style={{
                height: `${12 + Math.random() * 20}px`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
