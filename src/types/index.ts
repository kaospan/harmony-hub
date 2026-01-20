// Music service providers
export type MusicProvider = 'spotify' | 'apple_music' | 'deezer' | 'soundcloud' | 'youtube' | 'amazon_music';

// Song section labels for structured navigation
export type SectionLabel = 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro' | 'solo' | 'breakdown';

// Track section with timestamps (used for seeking within a song)
export interface TrackSection {
  id: string;
  label: SectionLabel;
  start_ms: number;
  end_ms?: number;
}

// Provider link information
export interface ProviderLink {
  provider: MusicProvider;
  provider_track_id: string;
  url_web?: string;
  url_app?: string;
  url_preview?: string;
  track_uuid?: string;
}

// Canonical track shape for unified search results
export interface Track {
  id: string;
  title: string;
  artists?: string[]; // Array of artist names (optional for backward compatibility)
  album?: string;
  duration_ms?: number;
  artwork_url?: string;
  isrc?: string;
  
  // Provider-specific data (optional - populated by unified search)
  providerIds?: Partial<Record<MusicProvider, string>>; // Map of provider -> provider track ID
  providerLinks?: ProviderLink[]; // Array of available provider links
  
  // DB/legacy fields for backward compatibility
  external_id?: string;
  provider?: MusicProvider;
  artist?: string; // Single artist string from DB
  cover_url?: string;
  preview_url?: string;
  spotify_id?: string;
  youtube_id?: string;
  url_spotify_web?: string;
  url_spotify_app?: string;
  url_youtube?: string;
  
  // Harmonic fingerprint data
  detected_key?: string;
  detected_mode?: 'major' | 'minor' | 'unknown';
  progression_raw?: string[];
  progression_roman?: string[];
  loop_length_bars?: number;
  cadence_type?: 'none' | 'loop' | 'plagal' | 'authentic' | 'deceptive' | 'other';
  confidence_score?: number;
  analysis_source?: 'metadata' | 'crowd' | 'analysis';
  
  // Audio features
  energy?: number;
  danceability?: number;
  valence?: number;
  
  // Song sections (intro, verse, chorus, etc.) with timestamps
  sections?: TrackSection[];
  
  // Metadata
  popularity_score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  preferred_provider?: MusicProvider | 'none';
  created_at?: string;
  updated_at?: string;
}

export interface UserProvider {
  id: string;
  user_id: string;
  provider: MusicProvider;
  provider_user_id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  connected_at: string;
}

export interface UserInteraction {
  id: string;
  user_id: string;
  track_id: string;
  interaction_type: 'like' | 'save' | 'skip' | 'more_harmonic' | 'more_vibe' | 'share';
  created_at: string;
}

export interface UserCredits {
  id: string;
  user_id: string;
  monthly_allowance: number;
  credits_used: number;
  last_reset: string;
}

export interface ChordSubmission {
  id: string;
  track_id: string;
  user_id: string;
  detected_key?: string;
  detected_mode?: 'major' | 'minor';
  progression_roman?: string[];
  status: 'pending' | 'approved' | 'rejected';
  moderated_by?: string;
  created_at: string;
}

export type InteractionType = 'like' | 'save' | 'skip' | 'more_harmonic' | 'more_vibe' | 'share';

// Play event types
export type PlayAction = 'open_app' | 'open_web' | 'preview';

export interface PlayEvent {
  id: string;
  user_id?: string;
  track_id: string;
  provider: MusicProvider;
  action: PlayAction;
  played_at: string;
  context?: string;
  device?: string;
  metadata?: Record<string, any>;
}

// Track connections (WhoSampled-style)
export type ConnectionType = 'sample' | 'cover' | 'interpolation' | 'remix' | 'inspiration';

// What element of the song was sampled/used
export type SampleElement = 'hook' | 'lyrics' | 'melody' | 'bassline' | 'drums' | 'vocals' | 'instrumental' | 'multiple' | 'other';

export interface TrackConnection {
  id: string;
  from_track_id: string;
  to_track_id: string;
  connection_type: ConnectionType;
  /** What part of the song was used (hook, lyrics, bassline, drums, etc.) */
  sample_element?: SampleElement;
  /** Description of how the sample was used */
  sample_description?: string;
  confidence?: number;
  evidence_url?: string;
  evidence_text?: string;
  created_at: string;
  created_by?: string;
}

export interface ConnectionGraph {
  track: Track;
  upstream: Array<TrackConnection & { track: Track }>;   // What this track comes from
  downstream: Array<TrackConnection & { track: Track }>; // What this track influenced
  most_popular_derivative?: Track;
}

// Album type
export interface Album {
  id: string;
  title: string;
  artist_id?: string;
  artist_name: string;
  cover_url?: string;
  release_date?: string;
  total_tracks?: number;
  tracks?: Track[];
  spotify_id?: string;
  provider?: MusicProvider;
  created_at?: string;
}

// Artist type
export interface Artist {
  id: string;
  name: string;
  image_url?: string;
  bio?: string;
  genres?: string[];
  follower_count?: number;
  spotify_id?: string;
  youtube_channel_id?: string;
  provider?: MusicProvider;
  albums?: Album[];
  top_tracks?: Track[];
  created_at?: string;
}

// Comment with likes for live feed
export interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
  /** Context: track_id, album_id, or artist_id */
  context_type: 'track' | 'album' | 'artist';
  context_id: string;
  likes_count: number;
  user_liked?: boolean;
  user?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

// Nearby listener activity
export interface NearbyListener {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  listened_at: string;
  time_ago: string;
}

// Search types
export interface SearchResult {
  tracks: Track[];
  total: number;
  cached: boolean;
  partial_results?: string[]; // List of providers that had errors
  warnings?: string[];
}

export interface SearchParams {
  query: string;
  market?: string;
  limit?: number;
}

// 2FA types
export interface TwoFactorSetupResult {
  otpauth_uri: string;
  secret: string;
  backup_codes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  backup_codes_remaining: number;
}

export interface TwoFactorVerifyRequest {
  code: string;
}

// Roman numeral to display mapping
export const ROMAN_NUMERALS = {
  'I': { label: 'I', class: 'chord-i' },
  'i': { label: 'i', class: 'chord-i' },
  'II': { label: 'II', class: 'chord-ii' },
  'ii': { label: 'ii', class: 'chord-ii' },
  'III': { label: 'III', class: 'chord-iii' },
  'iii': { label: 'iii', class: 'chord-iii' },
  'IV': { label: 'IV', class: 'chord-iv' },
  'iv': { label: 'iv', class: 'chord-iv' },
  'V': { label: 'V', class: 'chord-v' },
  'v': { label: 'v', class: 'chord-v' },
  'VI': { label: 'VI', class: 'chord-vi' },
  'vi': { label: 'vi', class: 'chord-vi' },
  'VII': { label: 'VII', class: 'chord-vii' },
  'vii': { label: 'vii', class: 'chord-vii' },
} as const;
