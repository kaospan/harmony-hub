-- Provider-first schema and RPCs
create extension if not exists pgcrypto;

-- Table: provider_accounts (tokens encrypted, not client-readable)
create table if not exists public.provider_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('spotify','youtube','apple','deezer','tidal','soundcloud','bandlab')),
  access_token bytea not null,
  refresh_token bytea,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

alter table public.provider_accounts enable row level security;
-- Deny select/update/delete/insert to authenticated directly. No policies means blocked; only functions may touch.

create index if not exists idx_provider_accounts_user_provider on public.provider_accounts(user_id, provider);

-- Table: external_tracks (cache of provider search/recently played)
create table if not exists public.external_tracks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_track_id text not null,
  title text not null,
  artist text not null,
  album text,
  duration_ms integer,
  artwork_url text,
  isrc text,
  raw_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(provider, provider_track_id)
);

alter table public.external_tracks enable row level security;
-- Allow authenticated read-only for cache
create policy if not exists "external_tracks_read" on public.external_tracks
for select using (auth.uid() is not null);
-- Writes only via security definer functions (no insert/update policies for client).

create index if not exists idx_external_tracks_provider_track on public.external_tracks(provider, provider_track_id);

-- OAuth state table for PKCE/state tracking
create table if not exists public.oauth_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  state text not null,
  code_verifier text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  primary key (provider, state)
);

alter table public.oauth_states enable row level security;
-- No select/insert/update/delete policies: only security definer RPCs/functions access.

create index if not exists idx_oauth_states_user_provider on public.oauth_states(user_id, provider);

-- Track provider links indexes
create index if not exists idx_track_provider_links_track_provider on public.track_provider_links(track_id, provider);
create index if not exists idx_track_provider_links_provider_track on public.track_provider_links(provider, provider_track_id);

-- updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger provider_accounts_updated_at
before update on public.provider_accounts
for each row execute function public.update_updated_at();

create trigger external_tracks_updated_at
before update on public.external_tracks
for each row execute function public.update_updated_at();

-- Helper to build PKCE challenge
create or replace function public.pkce_challenge(verifier text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(encode(digest(verifier, 'sha256'), 'base64'), '+', '-'), '/', '_'), '=', '');
$$;

-- SECURITY DEFINER: start_spotify_oauth
create or replace function public.start_spotify_oauth()
returns table(redirect_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_state text := encode(gen_random_bytes(24), 'hex');
  v_verifier text := replace(encode(gen_random_bytes(32), 'base64'), '=', '');
  v_challenge text;
  v_client_id text := current_setting('app.settings.spotify_client_id', true);
  v_redirect_uri text := current_setting('app.settings.spotify_redirect_uri', true);
  v_scope text := 'user-read-recently-played user-library-read user-read-playback-position';
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(v_client_id, '') = '' or coalesce(v_redirect_uri, '') = '' then
    raise exception 'Spotify client settings missing';
  end if;

  -- cleanup old states for this user/provider
  delete from public.oauth_states where user_id = v_user and provider = 'spotify' and expires_at < now();

  v_challenge := replace(replace(replace(encode(digest(v_verifier, 'sha256'), 'base64'), '+','-'), '/','_'), '=','');

  insert into public.oauth_states (user_id, provider, state, code_verifier)
  values (v_user, 'spotify', v_state, v_verifier)
  on conflict (provider, state) do update set code_verifier = excluded.code_verifier, created_at = now(), expires_at = now() + interval '15 minutes';

  redirect_url := format(
    'https://accounts.spotify.com/authorize?response_type=code&client_id=%s&redirect_uri=%s&scope=%s&state=%s&code_challenge=%s&code_challenge_method=S256',
    v_client_id,
    v_redirect_uri,
    replace(v_scope, ' ', '%20'),
    v_state,
    v_challenge
  );
  return next;
end;
$$;

grant execute on function public.start_spotify_oauth() to authenticated;

create or replace function public.get_provider_status()
returns table(provider text, connected boolean, expires_at timestamptz, scopes text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select provider, true as connected, expires_at, scopes
  from public.provider_accounts
  where user_id = v_user;
end;
$$;

grant execute on function public.get_provider_status() to authenticated;

-- SECURITY DEFINER: store tokens (used by edge function)
create or replace function public.store_spotify_tokens(
  p_user_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_scope text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := current_setting('app.settings.encryption_key', true);
  v_scopes text[] := case when coalesce(p_scope, '') = '' then '{}'::text[] else string_to_array(p_scope, ' ') end;
begin
  if coalesce(v_key, '') = '' then
    raise exception 'Encryption key not configured';
  end if;

  insert into public.provider_accounts (user_id, provider, access_token, refresh_token, expires_at, scopes)
  values (
    p_user_id,
    'spotify',
    pgp_sym_encrypt(p_access_token, v_key),
    case when p_refresh_token is not null then pgp_sym_encrypt(p_refresh_token, v_key) end,
    p_expires_at,
    v_scopes
  )
  on conflict (user_id, provider) do update
    set access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        scopes = excluded.scopes,
        updated_at = now();
end;
$$;

grant execute on function public.store_spotify_tokens(uuid, text, text, timestamptz, text) to service_role;

-- SECURITY DEFINER: fetch decrypted spotify credentials for a user (service_role only)
create or replace function public.get_spotify_credentials(p_user_id uuid)
returns table(access_token text, refresh_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := current_setting('app.settings.encryption_key', true);
begin
  if coalesce(v_key, '') = '' then
    raise exception 'Encryption key not configured';
  end if;

  return query
  select
    pgp_sym_decrypt(access_token, v_key)::text,
    case when refresh_token is not null then pgp_sym_decrypt(refresh_token, v_key)::text else null end,
    expires_at
  from public.provider_accounts
  where user_id = p_user_id and provider = 'spotify';
end;
$$;

grant execute on function public.get_spotify_credentials(uuid) to service_role;
