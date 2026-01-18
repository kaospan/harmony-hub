import { useQuery } from '@tanstack/react-query';
import { searchTracksByQuery, searchTracksByProgression, fetchTrendingTracks, fetchTracksForCompare } from '@/api/tracks';

export function useTrackSearch(query: string, enabled: boolean, limit = 20) {
  return useQuery({
    queryKey: ['track-search', query, limit],
    queryFn: () => searchTracksByQuery(query, limit),
    enabled: enabled && !!query,
    staleTime: 1000 * 60 * 5,
  });
}

export function useChordSearch(chords: string[], enabled: boolean, limit = 20) {
  return useQuery({
    queryKey: ['chord-search', chords.join('-'), limit],
    queryFn: () => searchTracksByProgression(chords, limit),
    enabled: enabled && chords.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTrendingTracks(limit = 10) {
  return useQuery({
    queryKey: ['trending-tracks', limit],
    queryFn: () => fetchTrendingTracks(limit),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCompareTracks(limit = 50) {
  return useQuery({
    queryKey: ['compare-tracks', limit],
    queryFn: () => fetchTracksForCompare(limit),
    staleTime: 1000 * 60 * 5,
  });
}
