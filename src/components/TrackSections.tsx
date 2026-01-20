import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { TrackSection, SectionLabel } from '@/types';
import { usePlayer } from '@/player/PlayerContext';
import { cn } from '@/lib/utils';

interface TrackSectionsProps {
  sections: TrackSection[];
  className?: string;
}

const SECTION_META: Record<SectionLabel, { label: string; color: string }> = {
  intro: { label: 'Intro', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  verse: { label: 'Verse', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'pre-chorus': { label: 'Pre-Chorus', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  chorus: { label: 'Chorus', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  bridge: { label: 'Bridge', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  outro: { label: 'Outro', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  solo: { label: 'Solo', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  breakdown: { label: 'Breakdown', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Displays clickable section pills (Intro, Verse, Chorus, etc.) for a track.
 * Clicking a section seeks the current player to that timestamp.
 */
export function TrackSections({ sections, className }: TrackSectionsProps) {
  const { seekTo, open } = usePlayer();

  if (!sections || sections.length === 0) return null;

  const handleSectionClick = (section: TrackSection) => {
    const startSec = Math.floor(section.start_ms / 1000);
    seekTo(startSec);
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {sections.map((section, idx) => {
        const meta = SECTION_META[section.label] ?? {
          label: section.label,
          color: 'bg-muted text-muted-foreground border-border',
        };

        return (
          <motion.button
            key={section.id || idx}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSectionClick(section)}
            disabled={!open}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
              meta.color,
              !open && 'opacity-50 cursor-not-allowed'
            )}
            title={open ? `Jump to ${meta.label} at ${formatTime(section.start_ms)}` : 'Start playing to navigate sections'}
          >
            <Play className="w-3 h-3" />
            <span>{meta.label}</span>
            <span className="opacity-60">{formatTime(section.start_ms)}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
