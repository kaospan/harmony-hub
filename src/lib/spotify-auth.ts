/**
 * Spotify OAuth 2.0 with PKCE Flow
 * Handles user authentication for personalized data access
 */

import { supabase } from '@/integrations/supabase/client';

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_REDIRECT_URI = `${window.location.origin}/auth/callback/spotify`;
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Scopes for user data access
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'user-library-read',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

/**
 * Generate cryptographic random string for PKCE
 */
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

/**
 * Generate code verifier and challenge for PKCE
 */
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { verifier, challenge };
}

/**
 * Store OAuth state in Supabase for security validation
 */
async function storeOAuthState(state: string, codeVerifier: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to connect Spotify');

  const { error } = await supabase.from('oauth_states').insert({
    user_id: user.id,
    provider: 'spotify',
    state,
    code_verifier: codeVerifier,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
  });

  if (error) throw error;
}

/**
 * Retrieve and validate OAuth state
 */
async function validateOAuthState(state: string): Promise<{ userId: string; codeVerifier: string } | null> {
  const { data, error } = await supabase
    .from('oauth_states')
    .select('user_id, code_verifier')
    .eq('state', state)
    .eq('provider', 'spotify')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;

  // Clean up used state
  await supabase.from('oauth_states').delete().eq('state', state);

  return { userId: data.user_id, codeVerifier: data.code_verifier };
}

/**
 * Initiate Spotify OAuth flow
 */
export async function initiateSpotifyAuth(): Promise<void> {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('Spotify client ID not configured');
  }

  const state = generateRandomString(16);
  const { verifier, challenge } = await generatePKCE();

  // Store state for callback validation
  await storeOAuthState(state, verifier);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  // Redirect to Spotify
  window.location.href = `${SPOTIFY_AUTH_URL}?${params}`;
}

/**
 * Handle Spotify OAuth callback
 */
export async function handleSpotifyCallback(code: string, state: string): Promise<boolean> {
  const stateData = await validateOAuthState(state);
  if (!stateData) {
    throw new Error('Invalid or expired OAuth state');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: stateData.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokens = await tokenResponse.json();

  // Get Spotify user profile
  const profileResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch Spotify profile');
  }

  const spotifyProfile = await profileResponse.json();

  // Store provider connection in database
  const { error } = await supabase.from('user_providers').upsert({
    user_id: stateData.userId,
    provider: 'spotify',
    provider_user_id: spotifyProfile.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    connected_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id,provider',
  });

  if (error) throw error;

  return true;
}

/**
 * Refresh Spotify access token
 */
export async function refreshSpotifyToken(userId: string): Promise<string | null> {
  const { data: provider, error } = await supabase
    .from('user_providers')
    .select('refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'spotify')
    .single();

  if (error || !provider?.refresh_token) return null;

  // Check if token is still valid
  if (provider.expires_at && new Date(provider.expires_at) > new Date()) {
    const { data } = await supabase
      .from('user_providers')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'spotify')
      .single();
    return data?.access_token ?? null;
  }

  // Refresh the token
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: provider.refresh_token,
      client_id: SPOTIFY_CLIENT_ID,
    }),
  });

  if (!response.ok) return null;

  const tokens = await response.json();

  // Update stored tokens
  await supabase.from('user_providers').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? provider.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq('user_id', userId).eq('provider', 'spotify');

  return tokens.access_token;
}

/**
 * Get valid Spotify access token for user
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return refreshSpotifyToken(user.id);
}

/**
 * Disconnect Spotify
 */
export async function disconnectSpotify(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('user_providers').delete()
    .eq('user_id', user.id)
    .eq('provider', 'spotify');
}
