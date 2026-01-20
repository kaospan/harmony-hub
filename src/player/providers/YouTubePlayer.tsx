import { useEffect, useMemo } from 'react';
import { Provider } from '../PlayerContext';

interface YouTubePlayerProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

const ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

export function YouTubePlayer({ providerTrackId, autoplay }: YouTubePlayerProps) {
  const src = useMemo(() => {
    if (!providerTrackId) return null;
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      modestbranding: '1',
      rel: '0',
    });
    return `https://www.youtube.com/embed/${providerTrackId}?${params.toString()}`;
  }, [providerTrackId, autoplay]);

  useEffect(() => {
    // no-op, placeholder for future events
  }, [providerTrackId]);

  if (!src) return null;

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
      <iframe
        className="w-full h-full"
        src={src}
        allow={ALLOW}
        allowFullScreen
        title="YouTube player"
      />
    </div>
  );
}
