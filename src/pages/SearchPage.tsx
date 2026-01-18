import { useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { ChordBadge } from '@/components/ChordBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { progressionArchetypes } from '@/data/seedTracks';
import { Track } from '@/types';
import { Search, Music, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTrackSearch, useChordSearch, useTrendingTracks } from '@/hooks/api/useTracks';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'song' | 'chord'>('song');

  const chordQuery = query
    .toUpperCase()
    .split(/[-–—,\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const { data: songResults = [], isLoading: songLoading } = useTrackSearch(
    query,
    searchMode === 'song' && !!query
  );
  const { data: chordResults = [], isLoading: chordLoading } = useChordSearch(
    chordQuery,
    searchMode === 'chord' && !!query
  );
  const { data: trending = [] } = useTrendingTracks(8);

  const results: Track[] = searchMode === 'song' ? songResults : chordResults;
  const isSearching = searchMode === 'song' ? songLoading : chordLoading;

  const handleSearch = () => {
    if (!query.trim()) return;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Side navigation - Desktop only */}
      <div className="hidden lg:block">
        <BottomNav />
      </div>

      <div className="flex-1 pb-24 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-40 glass-strong safe-top">
          <div className="px-4 py-4 max-w-4xl lg:mx-auto space-y-3">
            <h1 className="text-xl lg:text-2xl font-bold">Search</h1>
            
            {/* Search mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={searchMode === 'song' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('song')}
                className="flex-1 lg:flex-initial"
              >
                <Music className="w-4 h-4 mr-1.5" />
                Song / Artist
              </Button>
              <Button
                variant={searchMode === 'chord' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('chord')}
                className="flex-1 lg:flex-initial"
              >
                <TrendingUp className="w-4 h-4 mr-1.5" />
                Chord Progression
              </Button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={
                  searchMode === 'song'
                    ? 'Search songs or artists...'
                    : 'e.g., vi-IV-I-V or I-V-vi-IV'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-muted/50"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 py-4 max-w-4xl lg:mx-auto space-y-6">
        {/* Quick chord searches */}
        {searchMode === 'chord' && !query && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Popular Progressions
            </h2>
            <div className="space-y-2">
              {progressionArchetypes.slice(0, 5).map((archetype, index) => (
                <motion.button
                  key={archetype.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setQuery(archetype.progression.join('-'));
                    handleSearch();
                  }}
                  className="w-full p-4 glass rounded-xl text-left group hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{archetype.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {archetype.progression.map((chord, i) => (
                      <ChordBadge key={i} chord={chord} size="sm" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {archetype.description}
                  </p>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Search results */}
        {results.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Results ({results.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 glass rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex gap-4">
                    {track.cover_url && (
                      <img
                        src={track.cover_url}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{track.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                      {track.progression_roman && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {track.progression_roman.map((chord, i) => (
                            <ChordBadge key={i} chord={chord} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* No results */}
        {query && !isSearching && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different search term
            </p>
          </div>
        )}

        {/* Trending section when no query */}
        {!query && searchMode === 'song' && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Trending Tracks
            </h2>
            <div className="space-y-2">
              {trending.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 glass rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center w-8 text-lg font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    {track.cover_url && (
                      <img
                        src={track.cover_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{track.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom navigation - Mobile only */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
