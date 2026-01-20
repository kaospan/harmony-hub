import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Disc3, Users, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveCommentFeed } from '@/components/LiveCommentFeed';
import { NearbyListenersPanel } from '@/components/NearbyListenersPanel';
import { SampleConnections } from '@/components/SampleConnections';
import { BottomNav } from '@/components/BottomNav';
import { Artist, Album, Track } from '@/types';
import { usePlayer, resolveDefaultProvider } from '@/player/PlayerContext';
import { useConnectedProviders } from '@/hooks/api/useConnectedProviders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Mock artist data - replace with API call
const mockArtist: Artist = {
  id: 'artist-1',
  name: 'The Weeknd',
  image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop',
  bio: 'Abel Makkonen Tesfaye, known professionally as the Weeknd, is a Canadian singer, songwriter, and record producer.',
  follower_count: 95000000,
  spotify_id: '1Xyo4u8uXC1ZmMpatF05PJ',
  albums: [
    {
      id: 'album-1',
      title: 'After Hours',
      artist_name: 'The Weeknd',
      artist_id: 'artist-1',
      cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
      release_date: '2020-03-20',
      total_tracks: 14,
    },
    {
      id: 'album-2',
      title: 'Dawn FM',
      artist_name: 'The Weeknd',
      artist_id: 'artist-1',
      cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop',
      release_date: '2022-01-07',
      total_tracks: 16,
    },
  ],
  top_tracks: [
    {
      id: 'seed-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      duration_ms: 200000,
      spotify_id: '0VjIjW4GlUZAMYd2vXMi3b',
      youtube_id: '4NRXx6U8ABQ',
    },
    {
      id: 'seed-2',
      title: 'Save Your Tears',
      artist: 'The Weeknd',
      duration_ms: 215000,
      spotify_id: '5QO79kh1waicV47BqGRL3g',
      youtube_id: 'XXYlFuWEuKI',
    },
    {
      id: 'seed-3',
      title: 'Starboy',
      artist: 'The Weeknd ft. Daft Punk',
      duration_ms: 230000,
      spotify_id: '7MXVkk9YMctZqd1Srtv4MB',
      youtube_id: '34Na4j8AVgA',
    },
  ],
};

function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const { openPlayer } = usePlayer();
  const connectedProviders = useConnectedProviders();
  const defaultProvider = resolveDefaultProvider(connectedProviders);

  useEffect(() => {
    // TODO: Replace with actual API call
    setLoading(true);
    setTimeout(() => {
      setArtist(mockArtist);
      setLoading(false);
    }, 300);
  }, [artistId]);

  const handlePlayTrack = (track: Track) => {
    const providerTrackId = defaultProvider === 'spotify' ? track.spotify_id : track.youtube_id;
    openPlayer({
      canonicalTrackId: track.id,
      provider: defaultProvider,
      providerTrackId: providerTrackId ?? null,
      autoplay: true,
      context: 'artist',
    });
  };

  const handlePlayTopSongs = () => {
    if (artist?.top_tracks?.[0]) {
      handlePlayTrack(artist.top_tracks[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative">
        {/* Background blur */}
        <div className="absolute inset-0 overflow-hidden">
          {artist.image_url && (
            <img
              src={artist.image_url}
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

          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
            {/* Artist image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden shadow-2xl flex-shrink-0"
            >
              {artist.image_url ? (
                <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Music className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </motion.div>

            {/* Artist info */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-sm font-medium text-primary mb-2">Artist</p>
              <h1 className="text-3xl md:text-5xl font-bold mb-2">{artist.name}</h1>
              
              {artist.follower_count && (
                <p className="flex items-center gap-2 justify-center md:justify-start text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {formatFollowers(artist.follower_count)} followers
                </p>
              )}

              {artist.bio && (
                <p className="mt-4 text-sm text-muted-foreground max-w-2xl line-clamp-3">
                  {artist.bio}
                </p>
              )}

              <div className="flex items-center gap-3 mt-6 justify-center md:justify-start">
                <Button size="lg" onClick={handlePlayTopSongs} className="gap-2">
                  <Play className="w-5 h-5" />
                  Play Top Songs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="p-6">
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="samples">Samples</TabsTrigger>
          </TabsList>

          <TabsContent value="popular" className="mt-6">
            <h2 className="text-xl font-bold mb-4">Popular Songs</h2>
            <div className="space-y-1">
              {artist.top_tracks?.map((track, index) => (
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
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(track.duration_ms)}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="albums" className="mt-6">
            <h2 className="text-xl font-bold mb-4">Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {artist.albums?.map((album, index) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={`/album/${album.id}`}
                    className="block group"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 shadow-lg">
                      {album.cover_url ? (
                        <img
                          src={album.cover_url}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Disc3 className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                      {album.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {album.release_date && new Date(album.release_date).getFullYear()}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="samples" className="mt-6">
            <SampleConnections contextType="artist" contextId={artist.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Nearby Listeners */}
      <div className="p-6 border-t border-border">
        <NearbyListenersPanel contextType="artist" contextId={artist.id} />
      </div>

      {/* Live Comment Feed */}
      <LiveCommentFeed contextType="artist" contextId={artist.id} />

      <BottomNav />
    </div>
  );
}
