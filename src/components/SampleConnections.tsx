import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Music, Layers, Mic2, Drum, Guitar, Piano } from 'lucide-react';
import { TrackConnection, SampleElement, Track, ConnectionType } from '@/types';
import { cn } from '@/lib/utils';

interface SampleConnectionsProps {
  contextType: 'track' | 'album' | 'artist';
  contextId: string;
}

// Extended connection with track data for display
interface SampleConnectionDisplay extends TrackConnection {
  from_track?: Partial<Track>;
  to_track?: Partial<Track>;
}

// Mock sample connections - replace with API
const mockConnections: SampleConnectionDisplay[] = [
  {
    id: 'conn-1',
    from_track_id: 'seed-1',
    to_track_id: 'sample-1',
    connection_type: 'sample',
    sample_element: 'bassline',
    sample_description: 'Uses the iconic bassline from the original',
    created_at: new Date().toISOString(),
    from_track: {
      id: 'seed-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    },
    to_track: {
      id: 'sample-1',
      title: 'Take On Me',
      artist: 'a-ha',
      cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop',
    },
  },
  {
    id: 'conn-2',
    from_track_id: 'seed-1',
    to_track_id: 'sample-2',
    connection_type: 'sample',
    sample_element: 'drums',
    sample_description: 'Drum pattern inspired by 80s synth-pop',
    created_at: new Date().toISOString(),
    from_track: {
      id: 'seed-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    },
    to_track: {
      id: 'sample-2',
      title: 'Blue Monday',
      artist: 'New Order',
      cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop',
    },
  },
  {
    id: 'conn-3',
    from_track_id: 'seed-2',
    to_track_id: 'seed-1',
    connection_type: 'interpolation',
    sample_element: 'melody',
    sample_description: 'Melodic elements reused in later work',
    created_at: new Date().toISOString(),
    from_track: {
      id: 'seed-2',
      title: 'Save Your Tears',
      artist: 'The Weeknd',
      cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    },
    to_track: {
      id: 'seed-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    },
  },
];

const sampleElementConfig: Record<SampleElement, { icon: typeof Music; label: string; color: string }> = {
  hook: { icon: Music, label: 'Hook', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  lyrics: { icon: Mic2, label: 'Lyrics', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  melody: { icon: Piano, label: 'Melody', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  bassline: { icon: Guitar, label: 'Bassline', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  drums: { icon: Drum, label: 'Drums', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  vocals: { icon: Mic2, label: 'Vocals', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  instrumental: { icon: Music, label: 'Instrumental', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  multiple: { icon: Layers, label: 'Multiple', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  other: { icon: Music, label: 'Other', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

function SampleBadge({ element }: { element: SampleElement }) {
  const config = sampleElementConfig[element];
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
      config.color
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ConnectionCard({ connection, index }: { connection: SampleConnectionDisplay; index: number }) {
  const isSampler = connection.connection_type === 'sample';
  const fromTrack = connection.from_track;
  const toTrack = connection.to_track;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      {/* From track */}
      <Link
        to={`/track/${fromTrack?.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {fromTrack?.cover_url ? (
            <img
              src={fromTrack.cover_url}
              alt={fromTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{fromTrack?.title}</p>
          <p className="text-xs text-muted-foreground truncate">{fromTrack?.artist}</p>
        </div>
      </Link>

      {/* Connection indicator */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {isSampler ? 'samples' : connection.connection_type}
        </span>
        <ArrowRight className="w-5 h-5 text-primary" />
        {connection.sample_element && (
          <SampleBadge element={connection.sample_element} />
        )}
      </div>

      {/* To track */}
      <Link
        to={`/track/${toTrack?.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {toTrack?.cover_url ? (
            <img
              src={toTrack.cover_url}
              alt={toTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{toTrack?.title}</p>
          <p className="text-xs text-muted-foreground truncate">{toTrack?.artist}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export function SampleConnections({ contextType, contextId }: SampleConnectionsProps) {
  const [connections, setConnections] = useState<SampleConnectionDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    setLoading(true);
    setTimeout(() => {
      setConnections(mockConnections);
      setLoading(false);
    }, 300);
  }, [contextType, contextId]);

  const samplesConnections = connections.filter(c => c.connection_type === 'sample');
  const otherConnections = connections.filter(c => c.connection_type !== 'sample');

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-20 bg-muted/30 rounded-xl" />
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No sample connections found</p>
        <p className="text-sm">This content doesn't have any known samples</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Layers className="w-5 h-5" />
        Sample Connections
      </h2>

      {samplesConnections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Contains samples of
          </h3>
          {samplesConnections.map((connection, i) => (
            <ConnectionCard
              key={`${connection.from_track_id}-${connection.to_track_id}`}
              connection={connection}
              index={i}
            />
          ))}
        </div>
      )}

      {otherConnections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Related connections
          </h3>
          {otherConnections.map((connection, i) => (
            <ConnectionCard
              key={`${connection.from_track_id}-${connection.to_track_id}`}
              connection={connection}
              index={i + samplesConnections.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
