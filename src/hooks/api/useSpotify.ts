/**
 * React hooks for Spotify user data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { 
  getSpotifyProfile, 
  getTopTracks, 
  getTopArtists, 
  getRecentlyPlayed,
  computeUserMusicStats,
  getRecommendations,
  SpotifyUserProfile,
  SpotifyTopItem,
  SpotifyRecentPlay,
  UserMusicStats,
} from '@/lib/spotify-user-api';
import { 
  initiateSpotifyAuth, 
  disconnectSpotify,
  getSpotifyAccessToken,
} from '@/lib/spotify-auth';
import { Track } from '@/types';

/**
 * Check if Spotify is connected
 */
export function useSpotifyConnected() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['spotify-connected', user?.id],
    queryFn: async () => {
      const token = await getSpotifyAccessToken();
      return !!token;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get Spotify user profile
 */
export function useSpotifyProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['spotify-profile', user?.id],
    queryFn: getSpotifyProfile,
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get user's top tracks from Spotify
 */
export function useSpotifyTopTracks(
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['spotify-top-tracks', user?.id, timeRange, limit],
    queryFn: () => getTopTracks(timeRange, limit),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get user's top artists from Spotify
 */
export function useSpotifyTopArtists(
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20
) {
  const { user } = useAuth();

  return useQuery<SpotifyTopItem[]>({
    queryKey: ['spotify-top-artists', user?.id, timeRange, limit],
    queryFn: () => getTopArtists(timeRange, limit),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get user's recently played tracks
 */
export function useSpotifyRecentlyPlayed(limit = 20) {
  const { user } = useAuth();

  return useQuery<SpotifyRecentPlay[]>({
    queryKey: ['spotify-recently-played', user?.id, limit],
    queryFn: () => getRecentlyPlayed(limit),
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute - more frequently updated
  });
}

/**
 * Get computed user music stats
 */
export function useUserMusicStats() {
  const { user } = useAuth();

  return useQuery<UserMusicStats | null>({
    queryKey: ['user-music-stats', user?.id],
    queryFn: computeUserMusicStats,
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get personalized recommendations
 */
export function useSpotifyRecommendations(
  seedTrackIds: string[] = [],
  seedArtistIds: string[] = [],
  limit = 20
) {
  const { user } = useAuth();

  return useQuery<Track[]>({
    queryKey: ['spotify-recommendations', user?.id, seedTrackIds, seedArtistIds, limit],
    queryFn: () => getRecommendations(seedTrackIds, seedArtistIds, limit),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Connect Spotify account
 */
export function useConnectSpotify() {
  return useMutation({
    mutationFn: initiateSpotifyAuth,
  });
}

/**
 * Disconnect Spotify account
 */
export function useDisconnectSpotify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectSpotify,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotify-connected'] });
      queryClient.invalidateQueries({ queryKey: ['spotify-profile'] });
      queryClient.invalidateQueries({ queryKey: ['spotify-top-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['spotify-top-artists'] });
      queryClient.invalidateQueries({ queryKey: ['spotify-recently-played'] });
      queryClient.invalidateQueries({ queryKey: ['user-providers'] });
    },
  });
}
