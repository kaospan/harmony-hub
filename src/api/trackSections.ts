/**
 * Track Sections API
 * 
 * Clean API layer for fetching track sections.
 * No Supabase calls in JSX - all data fetching here.
 */

import { supabase } from '@/integrations/supabase/client';
import type { TrackSection } from '@/types';

/**
 * Fetch all sections for a track, ordered by start time
 */
export async function getTrackSections(trackId: string): Promise<TrackSection[]> {
  // Using rpc approach to avoid type issues with new table
  // Once migration is applied and types regenerated, can switch to .from('track_sections')
  const { data, error } = await supabase.rpc('get_track_sections' as never, {
    p_track_id: trackId,
  } as never);

  if (error) {
    // Table/function might not exist yet - return empty array gracefully
    console.debug('track_sections not available:', error.message);
    return [];
  }

  return (data as unknown as TrackSection[]) ?? [];
}

/**
 * Get a specific section by ID
 */
export async function getTrackSection(sectionId: string): Promise<TrackSection | null> {
  const { data, error } = await supabase.rpc('get_track_section_by_id' as never, {
    p_section_id: sectionId,
  } as never);

  if (error) {
    console.debug('get_track_section_by_id not available:', error.message);
    return null;
  }

  const sections = data as unknown as TrackSection[];
  return sections?.[0] ?? null;
}
