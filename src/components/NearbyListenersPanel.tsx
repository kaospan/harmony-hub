import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NearbyListener } from '@/types';
import { cn } from '@/lib/utils';

interface NearbyListenersPanelProps {
  contextType: 'track' | 'album' | 'artist';
  contextId: string;
}

// Mock nearby listeners - replace with API
const mockListeners: NearbyListener[] = [
  {
    id: 'listener-1',
    user_id: 'listener-1',
    display_name: 'Alex',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    listened_at: new Date(Date.now() - 120000).toISOString(),
    time_ago: '2m ago',
  },
  {
    id: 'listener-2',
    user_id: 'listener-2',
    display_name: 'Jordan',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',
    listened_at: new Date(Date.now() - 600000).toISOString(),
    time_ago: '10m ago',
  },
  {
    id: 'listener-3',
    user_id: 'listener-3',
    display_name: 'Sam',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sam',
    listened_at: new Date(Date.now() - 1800000).toISOString(),
    time_ago: '30m ago',
  },
  {
    id: 'listener-4',
    user_id: 'listener-4',
    display_name: 'Riley',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=riley',
    listened_at: new Date(Date.now() - 3600000).toISOString(),
    time_ago: '1h ago',
  },
  {
    id: 'listener-5',
    user_id: 'listener-5',
    display_name: 'Morgan',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=morgan',
    listened_at: new Date(Date.now() - 7200000).toISOString(),
    time_ago: '2h ago',
  },
];

function ListenerItem({ listener, index }: { listener: NearbyListener; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 p-2"
    >
      <div className="relative">
        <Avatar className="w-10 h-10 ring-2 ring-background">
          <AvatarImage src={listener.avatar_url} alt={listener.display_name} />
          <AvatarFallback>{listener.display_name?.[0] ?? 'U'}</AvatarFallback>
        </Avatar>
        {/* Online indicator for recent listeners */}
        {listener.time_ago.includes('m ago') && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{listener.display_name ?? 'Anonymous'}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {listener.time_ago}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function NearbyListenersPanel({ contextType, contextId }: NearbyListenersPanelProps) {
  const [listeners, setListeners] = useState<NearbyListener[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real-time API/WebSocket
    setLoading(true);
    setTimeout(() => {
      setListeners(mockListeners);
      setLoading(false);
    }, 300);
  }, [contextType, contextId]);

  // Group by recency
  const recentListeners = listeners.filter(l => 
    l.time_ago.includes('m ago') || l.time_ago === 'just now'
  );
  const olderListeners = listeners.filter(l => 
    !l.time_ago.includes('m ago') && l.time_ago !== 'just now'
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-40 bg-muted/30 rounded mb-4" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-10 h-10 rounded-full bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  if (listeners.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No nearby listeners yet</p>
        <p className="text-xs">Be the first in your area!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Users className="w-5 h-5" />
        Nearby Listeners
        <span className="text-sm font-normal text-muted-foreground">
          ({listeners.length})
        </span>
      </h2>

      {/* Compact avatar stack for preview */}
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {listeners.slice(0, 5).map((listener, i) => (
            <Avatar
              key={listener.user_id}
              className={cn(
                "w-9 h-9 ring-2 ring-background",
                i > 0 && "ml-[-8px]"
              )}
              style={{ zIndex: 5 - i }}
            >
              <AvatarImage src={listener.avatar_url} alt={listener.display_name} />
              <AvatarFallback>{listener.display_name?.[0] ?? 'U'}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        {listeners.length > 5 && (
          <span className="ml-2 text-sm text-muted-foreground">
            +{listeners.length - 5} more
          </span>
        )}
      </div>

      {/* Detailed list */}
      <div className="space-y-1">
        {recentListeners.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
              Listening now
            </p>
            {recentListeners.map((listener, i) => (
              <ListenerItem key={listener.user_id} listener={listener} index={i} />
            ))}
          </div>
        )}

        {olderListeners.length > 0 && (
          <div className="space-y-1 mt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
              Recently listened
            </p>
            {olderListeners.map((listener, i) => (
              <ListenerItem 
                key={listener.user_id} 
                listener={listener} 
                index={i + recentListeners.length} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
