create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  base_username text;
  fallback_username text;
  suffix integer := 0;
begin
  requested_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  base_username := coalesce(requested_username, 'user_' || left(replace(new.id::text, '-', ''), 10));
  fallback_username := left(base_username, 24);

  loop
    begin
      insert into public.profiles (id, username)
      values (new.id, fallback_username)
      on conflict (id) do nothing;
      exit;
    exception when unique_violation then
      suffix := suffix + 1;
      fallback_username := left(base_username, greatest(1, 24 - length('_' || suffix::text))) || '_' || suffix::text;
      if suffix > 1000 then
        raise exception 'Could not allocate a unique NEXUS username';
      end if;
    end;
  end loop;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to postgres;
