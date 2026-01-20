import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Clock, Calendar, Disc3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveCommentFeed } from '@/components/LiveCommentFeed';
import { NearbyListenersPanel } from '@/components/NearbyListenersPanel';
import { SampleConnections } from '@/components/SampleConnections';
import { BottomNav } from '@/components/BottomNav';
import { Album, Track } from '@/types';
import { usePlayer, resolveDefaultProvider } from '@/player/PlayerContext';
import { useConnectedProviders } from '@/hooks/api/useConnectedProviders';
import { cn } from '@/lib/utils';

// Mock album data for now - replace with API call
const mockAlbum: Album = {
  id: 'album-1',
  title: 'After Hours',
  artist_name: 'The Weeknd',
  artist_id: 'artist-1',
  cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop',
  release_date: '2020-03-20',
  total_tracks: 14,
  spotify_id: '4yP0hdKOZPNshxUOjY0cZj',
  tracks: [
    {
      id: 'track-1',
      title: 'Alone Again',
      artist: 'The Weeknd',
      duration_ms: 250000,
      spotify_id: '2gYj9lubBorOPIVWsTXugG',
      youtube_id: 'JH398xAYpZA',
    },
    {
      id: 'track-2',
      title: 'Too Late',
      artist: 'The Weeknd',
      duration_ms: 239000,
      spotify_id: '4eJ2GK3v8U4KM5xJUlJsVK',
      youtube_id: 'QLCpqdqeoII',
    },
    {
      id: 'seed-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      duration_ms: 200000,
      spotify_id: '0VjIjW4GlUZAMYd2vXMi3b',
      youtube_id: '4NRXx6U8ABQ',
    },
  ],
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const { openPlayer } = usePlayer();
  const connectedProviders = useConnectedProviders();
  const defaultProvider = resolveDefaultProvider(connectedProviders);

  useEffect(() => {
    // TODO: Replace with actual API call
    setLoading(true);
    setTimeout(() => {
      setAlbum(mockAlbum);
      setLoading(false);
    }, 300);
  }, [albumId]);

  const handlePlayTrack = (track: Track) => {
    const providerTrackId = defaultProvider === 'spotify' ? track.spotify_id : track.youtube_id;
    openPlayer({
      canonicalTrackId: track.id,
      provider: defaultProvider,
      providerTrackId: providerTrackId ?? null,
      autoplay: true,
      context: 'album',
    });
  };

  const handlePlayAll = () => {
    if (album?.tracks?.[0]) {
      handlePlayTrack(album.tracks[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Album not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative">
        {/* Background blur */}
        <div className="absolute inset-0 overflow-hidden">
          {album.cover_url && (
            <img
              src={album.cover_url}
              alt=""
              className="w-full h-full object-cover blur-3xl opacity-30 scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-6">
          <Link to="/feed" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Album art */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0"
            >
              {album.cover_url ? (
                <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Disc3 className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </motion.div>

            {/* Album info */}
            <div className="flex-1">
              <p className="text-sm font-medium text-primary mb-2">Album</p>
              <h1 className="text-3xl md:text-5xl font-bold mb-2">{album.title}</h1>
              <Link
                to={`/artist/${album.artist_id}`}
                className="text-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                {album.artist_name}
              </Link>

              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                {album.release_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(album.release_date).getFullYear()}
                  </span>
                )}
                {album.total_tracks && (
                  <span>{album.total_tracks} tracks</span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button size="lg" onClick={handlePlayAll} className="gap-2">
                  <Play className="w-5 h-5" />
                  Play All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Tracks</h2>
        <div className="space-y-1">
          {album.tracks?.map((track, index) => (
            <motion.button
              key={track.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handlePlayTrack(track)}
              className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group text-left"
            >
              <span className="w-8 text-center text-muted-foreground group-hover:hidden">
                {index + 1}
              </span>
              <Play className="w-4 h-4 hidden group-hover:block text-primary" />
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{track.title}</p>
                <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
              </div>

              {track.duration_ms && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(track.duration_ms)}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sample Connections */}
      <div className="p-6 border-t border-border">
        <SampleConnections contextType="album" contextId={album.id} />
      </div>

      {/* Nearby Listeners */}
      <div className="p-6 border-t border-border">
        <NearbyListenersPanel contextType="album" contextId={album.id} />
      </div>

      {/* Live Comment Feed */}
      <LiveCommentFeed contextType="album" contextId={album.id} />

      <BottomNav />
    </div>
  );
}
