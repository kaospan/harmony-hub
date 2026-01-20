-- 2FA hardening: move secrets out of profiles and lock behind security definer RPCs
create extension if not exists pgcrypto;

-- Remove legacy 2FA columns from profiles (secrets must not live in client-readable tables)
alter table if exists public.profiles
  drop column if exists twofa_secret,
  drop column if exists twofa_backup_codes,
  drop column if exists twofa_enabled;

-- Dedicated storage for 2FA secrets (never directly selectable via RLS)
create table if not exists public.auth_2fa_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  secret_encrypted bytea not null,
  backup_codes_hashed text[] not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

-- Deny direct access; only RPCs may touch this table
alter table public.auth_2fa_secrets enable row level security;

-- Helper: generate TOTP code for a given counter using HMAC-SHA1
create or replace function public._totp_code(secret_bytes bytea, counter bigint)
returns text
language plpgsql
strict
as $$
declare
  msg bytea := '\x0000000000000000';
  i int;
  digest_bytes bytea;
  offset int;
  bin int;
  code int;
begin
  -- Build 8-byte big-endian counter
  for i in 0..7 loop
    msg := set_byte(msg, 7 - i, ((counter >> (i * 8)) & 255)::int);
  end loop;

  digest_bytes := hmac(msg, secret_bytes, 'sha1');
  offset := get_byte(digest_bytes, length(digest_bytes) - 1) & 15;

  bin := ((get_byte(digest_bytes, offset) & 127) << 24)
       | ((get_byte(digest_bytes, offset + 1) & 255) << 16)
       | ((get_byte(digest_bytes, offset + 2) & 255) << 8)
       | (get_byte(digest_bytes, offset + 3) & 255);

  code := bin % 1000000;
  return lpad(code::text, 6, '0');
end;
$$;

-- RPC: initialize 2FA, generate secret + backup codes, store encrypted, return otpauth URI once
create or replace function public.setup_2fa()
returns table(otpauth_uri text, secret text, backup_codes text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_encryption_key text := current_setting('app.settings.encryption_key', true);
  v_secret_raw bytea;
  v_secret_base32 text;
  v_secret_encrypted bytea;
  v_backup_codes text[];
  v_backup_codes_hashed text[];
  v_email text;
  v_label text;
  v_issuer text := 'HarmonyHub';
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(v_encryption_key, '') = '' then
    raise exception 'Encryption key not configured (app.settings.encryption_key)';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    v_email := 'user-' || v_user_id::text;
  end if;

  v_secret_raw := gen_random_bytes(20);
  v_secret_base32 := replace(encode(v_secret_raw, 'base32'), '=', '');
  v_secret_encrypted := pgp_sym_encrypt(v_secret_raw, v_encryption_key);

  v_backup_codes := array(
    select upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 4) || '-' || substr(encode(gen_random_bytes(5), 'hex'), 1, 4))
    from generate_series(1, 10)
  );

  v_backup_codes_hashed := array(
    select encode(digest(replace(code, '-', ''), 'sha256'), 'hex')
    from unnest(v_backup_codes) code
  );

  insert into public.auth_2fa_secrets (user_id, secret_encrypted, backup_codes_hashed, enabled, created_at, verified_at)
  values (v_user_id, v_secret_encrypted, v_backup_codes_hashed, false, now(), null)
  on conflict (user_id) do update
    set secret_encrypted = excluded.secret_encrypted,
        backup_codes_hashed = excluded.backup_codes_hashed,
        enabled = false,
        created_at = now(),
        verified_at = null;

  v_label := regexp_replace(v_email, '[: ]', '_', 'g');
  otpauth_uri := format(
    'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
    v_issuer, v_label, v_secret_base32, v_issuer
  );

  secret := v_secret_base32;
  backup_codes := v_backup_codes;
  return next;
end;
$$;

-- RPC: verify TOTP server-side and enable 2FA on success
create or replace function public.verify_2fa(code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_encryption_key text := current_setting('app.settings.encryption_key', true);
  v_secret_raw bytea;
  v_counter bigint := floor(extract(epoch from now()) / 30);
  v_window int := 1;
  v_match boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(v_encryption_key, '') = '' then
    raise exception 'Encryption key not configured (app.settings.encryption_key)';
  end if;

  select pgp_sym_decrypt(secret_encrypted, v_encryption_key) into v_secret_raw
  from public.auth_2fa_secrets
  where user_id = v_user_id;

  if v_secret_raw is null then
    raise exception '2FA not initialized';
  end if;

  for i in -v_window..v_window loop
    if _totp_code(v_secret_raw, v_counter + i) = code then
      v_match := true;
      exit;
    end if;
  end loop;

  if v_match then
    update public.auth_2fa_secrets
      set enabled = true,
          verified_at = now()
      where user_id = v_user_id;
  end if;

  return v_match;
end;
$$;

-- RPC: verify backup code server-side and invalidate it atomically
create or replace function public.verify_backup_code(code text)
returns table(success boolean, remaining_codes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_hashed_input text;
  v_codes text[];
  v_updated text[];
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_hashed_input := encode(digest(replace(upper(code), '-', ''), 'sha256'), 'hex');

  select backup_codes_hashed into v_codes
  from public.auth_2fa_secrets
  where user_id = v_user_id and enabled = true;

  if v_codes is null then
    success := false;
    remaining_codes := 0;
    return next;
  end if;

  if array_position(v_codes, v_hashed_input) is null then
    success := false;
    remaining_codes := array_length(v_codes, 1);
    return next;
  end if;

  v_updated := array_remove(v_codes, v_hashed_input);

  update public.auth_2fa_secrets
    set backup_codes_hashed = v_updated
    where user_id = v_user_id;

  success := true;
  remaining_codes := coalesce(array_length(v_updated, 1), 0);
  return next;
end;
$$;

-- RPC: disable 2FA after validating a live TOTP code server-side
create or replace function public.disable_2fa(code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_encryption_key text := current_setting('app.settings.encryption_key', true);
  v_secret_raw bytea;
  v_counter bigint := floor(extract(epoch from now()) / 30);
  v_window int := 1;
  v_valid boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(v_encryption_key, '') = '' then
    raise exception 'Encryption key not configured (app.settings.encryption_key)';
  end if;

  select pgp_sym_decrypt(secret_encrypted, v_encryption_key) into v_secret_raw
  from public.auth_2fa_secrets
  where user_id = v_user_id;

  if v_secret_raw is null then
    return false;
  end if;

  for i in -v_window..v_window loop
    if _totp_code(v_secret_raw, v_counter + i) = code then
      v_valid := true;
      exit;
    end if;
  end loop;

  if v_valid then
    delete from public.auth_2fa_secrets where user_id = v_user_id;
  end if;

  return v_valid;
end;
$$;

-- RPC: read-only status (safe to expose to client)
create or replace function public.get_2fa_status()
returns table(enabled boolean, backup_codes_remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_enabled boolean;
  v_codes text[];
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select enabled, backup_codes_hashed into v_enabled, v_codes
  from public.auth_2fa_secrets
  where user_id = v_user_id;

  enabled := coalesce(v_enabled, false);
  backup_codes_remaining := coalesce(array_length(v_codes, 1), 0);
  return next;
end;
$$;

-- Grant RPC execution to authenticated users only
grant execute on function public.setup_2fa() to authenticated;
grant execute on function public.verify_2fa(text) to authenticated;
grant execute on function public.verify_backup_code(text) to authenticated;
grant execute on function public.disable_2fa(text) to authenticated;
grant execute on function public.get_2fa_status() to authenticated;
