-- Connected providers lightweight status
create or replace function public.get_connected_providers()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_connected boolean := false;
  v_premium boolean := false;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select true
  into v_connected
  from public.provider_accounts
  where user_id = v_user and provider = 'spotify'
  limit 1;

  select exists (
    select 1 from public.provider_accounts
    where user_id = v_user
      and provider = 'spotify'
      and scopes is not null
      and 'streaming' = any(scopes)
  ) into v_premium;

  return jsonb_build_object(
    'spotify', jsonb_build_object(
      'connected', coalesce(v_connected, false),
      'premium', coalesce(v_premium, false)
    )
  );
end;
$$;

grant execute on function public.get_connected_providers() to authenticated;
