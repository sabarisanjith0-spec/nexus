-- NEXUS real group-chat backend
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_channel_created_idx
  on public.messages(channel_id, created_at);

alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles readable by authenticated users" on public.profiles;
create policy "profiles readable by authenticated users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users can create their own profile" on public.profiles;
create policy "users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "channels readable by authenticated users" on public.channels;
create policy "channels readable by authenticated users"
  on public.channels for select to authenticated using (true);

drop policy if exists "authenticated users can read messages" on public.messages;
create policy "authenticated users can read messages"
  on public.messages for select to authenticated using (true);

drop policy if exists "authenticated users can send messages" on public.messages;
create policy "authenticated users can send messages"
  on public.messages for insert to authenticated
  with check ((select auth.uid()) = user_id);

insert into public.channels (name)
values ('general'), ('showcase'), ('builds'), ('random')
on conflict (name) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
as $$
declare
  requested_username text;
  fallback_username text;
begin
  requested_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  fallback_username := 'user_' || left(replace(new.id::text, '-', ''), 10);

  insert into public.profiles (id, username)
  values (new.id, coalesce(requested_username, fallback_username))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Enable database change streaming for the chat table.
alter publication supabase_realtime add table public.messages;
