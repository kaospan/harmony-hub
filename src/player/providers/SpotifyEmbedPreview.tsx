interface SpotifyEmbedPreviewProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

export function SpotifyEmbedPreview({ providerTrackId, autoplay }: SpotifyEmbedPreviewProps) {
  if (!providerTrackId) return null;
  const params = new URLSearchParams({
    utm_source: 'harmony-hub',
  });
  const src = `https://open.spotify.com/embed/track/${providerTrackId}?${params.toString()}`;
  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
      <iframe
        className="w-full h-full"
        src={src}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen"
        loading="lazy"
        title="Spotify preview"
      />
    </div>
  );
}
