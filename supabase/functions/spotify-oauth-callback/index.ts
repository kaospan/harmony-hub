// Supabase Edge Function: Spotify OAuth callback
// Exchanges authorization code for tokens and stores them encrypted in provider_accounts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');
const SPOTIFY_REDIRECT_URI = Deno.env.get('SPOTIFY_REDIRECT_URI');
const APP_REDIRECT_SUCCESS = Deno.env.get('APP_REDIRECT_SUCCESS') ?? '/connections?spotify=connected';
const APP_REDIRECT_ERROR = Deno.env.get('APP_REDIRECT_ERROR') ?? '/connections?spotify=error';

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

function badRequest(message: string, status = 400) {
  return new Response(message, { status });
}

async function fetchSpotifyToken(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI!,
    client_id: SPOTIFY_CLIENT_ID!,
    code_verifier: codeVerifier,
  });

  const basic = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token exchange failed: ${res.status} ${text}`);
  }

  return await res.json();
}

async function handleOAuth(code: string, state: string) {
  // Lookup state
  const { data: stateRow, error: stateErr } = await supabase
    .from('oauth_states')
    .select('user_id, provider, code_verifier')
    .eq('provider', 'spotify')
    .eq('state', state)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (stateErr || !stateRow) throw new Error('Invalid or expired state');

  const tokens = await fetchSpotifyToken(code, stateRow.code_verifier);

  // Store encrypted tokens in provider_accounts using server-side pgp_sym_encrypt
  const { error: upsertErr } = await supabase.rpc('store_spotify_tokens', {
    p_user_id: stateRow.user_id,
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token ?? null,
    p_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
    p_scope: tokens.scope ?? '',
  });
  if (upsertErr) throw upsertErr;

  // Clean up state
  await supabase.from('oauth_states').delete().eq('provider', 'spotify').eq('state', state);
}

Deno.serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return badRequest('Server misconfigured');
    }
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
      return badRequest('Spotify env not set');
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) return badRequest('Missing code/state');

    await handleOAuth(code, state);
    return Response.redirect(new URL(APP_REDIRECT_SUCCESS, SUPABASE_URL).toString(), 302);
  } catch (err) {
    console.error('spotify-oauth-callback error', err);
    return Response.redirect(new URL(APP_REDIRECT_ERROR, SUPABASE_URL!).toString(), 302);
  }
});
