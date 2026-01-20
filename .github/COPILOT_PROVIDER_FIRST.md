You are GitHub Copilot working inside the repository "kaospan/harmony-hub".

This is a React + Vite + TypeScript app using Supabase (Auth + Postgres + RLS) plus Supabase Edge Functions.
There is NO traditional backend server. All privileged operations must happen via SECURITY DEFINER RPCs and/or Edge Functions.
You must implement real production code. No TODO handlers. No hardcoded counts. No secrets in client.

====================
CURRENT STATUS (ALREADY DONE)
====================
- Secure 2FA hardening is shipped:
  - migration 20260118103000_harden_2fa_security.sql applied
  - client TOTP removed (totp.ts deleted)
  - 2fa.ts uses RPC only
  - TwoFactorSetup/TwoFactorVerify wired to RPC only
  - app.settings.encryption_key is set for pgcrypto

Do NOT reintroduce client-side TOTP or secret reads.
Do NOT store secrets in client-readable tables.

====================
PRIMARY GOAL
====================
Make the app provider-first:
- Profile “Connected Services” actually connects Spotify (and later others)
- Feed and search become user-driven when provider connected
- Playback works by provider icons only (deep-link/app then web)
- Fallback mode remains (feed_items + existing cache) when no provider connected

====================
MANDATORY ORDER OF WORK
====================

PHASE A — Schema: provider accounts + external cache (SQL migration)
1) Create table: provider_accounts
   - id uuid pk default gen_random_uuid()
   - user_id uuid NOT NULL references auth.users(id) ON DELETE CASCADE
   - provider text NOT NULL (spotify|youtube|apple|deezer|tidal|soundcloud|bandlab)
   - access_token text NOT NULL (encrypted via pgcrypto)
   - refresh_token text (encrypted)
   - expires_at timestamptz
   - scopes text[] default '{}'
   - created_at timestamptz default now()
   - updated_at timestamptz default now()
   Constraints:
   - unique(user_id, provider)
   Security:
   - Enable RLS
   - Deny SELECT from client entirely (no select policies)
   - Allow only server writes via SECURITY DEFINER RPCs (do not add client insert/update policies)

2) Create table: external_tracks
   - id uuid pk default gen_random_uuid()
   - provider text NOT NULL
   - provider_track_id text NOT NULL
   - title text NOT NULL
   - artist text NOT NULL
   - album text
   - duration_ms int
   - artwork_url text
   - isrc text
   - raw_payload jsonb NOT NULL default '{}'::jsonb
   - updated_at timestamptz default now()
   Constraints:
   - unique(provider, provider_track_id)
   Security:
   - Enable RLS
   - Allow SELECT to authenticated users ONLY for cached results that are non-sensitive (this is safe)
   - Writes only via SECURITY DEFINER RPCs

3) Ensure existing canonical model remains:
   - tracks table is canonical (uuid id)
   - track_provider_links maps tracks.id -> provider_track_id + urls (web/app/preview)
   - feed_items references tracks.id ONLY (uuid), never seed-* strings

Add indexes:
- provider_accounts(user_id, provider)
- external_tracks(provider, provider_track_id)
- track_provider_links(track_id, provider)
- track_provider_links(provider, provider_track_id)

Add updated_at triggers using existing update_updated_at().

PHASE B — OAuth start RPC + callback Edge Function
4) Create SECURITY DEFINER RPC: start_spotify_oauth()
   - Input: none
   - Uses auth.uid() to bind user
   - Generates PKCE verifier+challenge + state
   - Stores verifier + state in a new table oauth_states(user_id, provider, state, code_verifier, created_at, expires_at)
     - RLS deny-select; only RPC/edge function access (security definer)
   - Returns:
     - redirect_url (text) to Spotify authorize endpoint including:
       client_id (from edge function env, not client)
       redirect_uri (edge function callback)
       scope list (user-read-recently-played, user-library-read, etc.)
       state
       code_challenge
       code_challenge_method=S256

IMPORTANT:
- Spotify client secret MUST NOT be in client code or Vite env.
- Put spotify client secret in Edge Function secrets only.
- The client only receives redirect_url.

5) Implement Supabase Edge Function: spotify-oauth-callback
   - Handles redirect from Spotify (code, state)
   - Validates state against oauth_states
   - Exchanges code for tokens using Spotify token endpoint
   - Stores encrypted tokens in provider_accounts (upsert by user_id+provider)
   - Deletes oauth_states row
   - Redirects back to app with success flag (no tokens in URL)

PHASE C — Safe status RPC for Profile UI
6) Implement SECURITY DEFINER RPC: get_provider_status()
   - Returns ONLY non-sensitive status for current user:
     [{ provider, connected: boolean, expires_at, scopes }]
   - No tokens ever returned.

PHASE D — Provider-first feed pipeline (Edge Function or RPC)
7) Implement Edge Function: sync_spotify_recently_played
   - Requires user session JWT (Authorization header)
   - Server reads provider_accounts tokens (decrypt)
   - Refresh token if needed (server-side)
   - Calls Spotify “Recently Played”
   - Upserts external_tracks
   - Links/creates canonical tracks:
     - Deduplicate by ISRC when possible; fallback to normalized title+artist+duration
     - Insert into tracks if missing
     - Upsert track_provider_links for spotify with:
       provider_track_id
       url_web (open.spotify.com/track/…)
       url_app (spotify:track:…)
       artwork_url (optional)
   - Returns ordered canonical track UUIDs for feed

Client: useFeed() logic
- Call get_provider_status()
- If spotify connected:
  - call sync_spotify_recently_played
  - render returned track ids
- Else fallback to feed_items

PHASE E — Provider-first search pipeline
8) Implement Edge Function: search_spotify
   - Input: q, limit, market
   - Uses server token from provider_accounts
   - Calls Spotify Search
   - Upserts external_tracks
   - Links/creates canonical tracks + track_provider_links
   - Returns unified search results:
     { track_id(uuid), title, artist, artwork_url, providers: { spotify: { playable:true }, ... } }

Client:
- If spotify connected: call search_spotify
- Else fallback to YouTube/public + canonical cache path

PHASE F — Profile “Connected Services” window
9) Fix Profile UI so it is not static:
   - Replace dead buttons with real click handlers
   - Button state logic uses get_provider_status()
   - “Connect Spotify” calls start_spotify_oauth() and redirects to returned URL
   - After callback: refresh status automatically (no reload needed)
   - If connected: show actions:
     - “Sync Recently Played” -> call sync_spotify_recently_played
     - “Import Likes” (stub now, implement next) -> calls edge function (later)
   - Ensure UI updates and no hardcoded counts

PHASE G — Likes/Saves persistence
10) Implement user_track_interactions table if not already:
    - user_id uuid
    - track_id uuid
    - type text (liked|saved)
    - source text (spotify|manual)
    - created_at
    - unique(user_id, track_id, type)
    - RLS: user owns rows
Profile counts read from DB and update immediately after user action.

====================
NON-NEGOTIABLE SECURITY CONSTRAINTS
====================
- No API secrets in client (no service role key, no provider secrets, no token endpoints).
- No tokens returned to client, ever.
- provider_accounts and oauth_states are not selectable by client.
- All token operations happen in Edge Functions / security definer functions.

====================
CODING RULES
====================
- Supabase calls in UI must go through src/api/* wrappers
- No supabase calls directly in JSX
- Keep mobile-first layout
- Ensure automatic refresh after connect/sync (invalidate queries or refetch)

====================
WHAT TO OUTPUT NOW
====================
Proceed immediately with:
1) SQL migration(s) for provider_accounts, external_tracks, oauth_states, and RPCs
2) Edge functions: spotify-oauth-callback, sync_spotify_recently_played, search_spotify
3) Client API wrappers: src/api/providers.ts, src/api/feed.ts, src/api/search.ts
4) Profile Connected Services UI wiring to RPC + Edge functions
5) Replace any remaining seed-* track IDs with canonical UUID usage

Do not ask questions. Implement in the mandatory order.
