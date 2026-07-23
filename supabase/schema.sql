-- PollHub database schema
-- Run this entire file once in the Supabase SQL editor (SQL Editor -> New query -> paste -> Run)

-- =========================================
-- 1. Tables
-- =========================================

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text unique not null,
  created_at  timestamptz default now()
);

create table polls (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  category    text not null default 'other',
  author_id   uuid references profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

create table options (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid references polls(id) on delete cascade,
  label       text not null,
  position    int not null default 0
);

create table votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid references polls(id) on delete cascade,
  option_id   uuid references options(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(poll_id, user_id) -- one vote per user per poll, enforced at the DB level
);

create table comments (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid references polls(id) on delete cascade,
  author_id   uuid references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz default now()
);

-- =========================================
-- 2. Row Level Security
-- =========================================

alter table profiles enable row level security;
alter table polls    enable row level security;
alter table options  enable row level security;
alter table votes    enable row level security;
alter table comments enable row level security;

-- profiles: anyone can read, only the owner can create/update their own row
create policy "profiles_select_all" on profiles
  for select using (true);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- polls: anyone can read, only the author can create as themselves
create policy "polls_select_all" on polls
  for select using (true);
create policy "polls_insert_own" on polls
  for insert with check (auth.uid() = author_id);

-- options: anyone can read, any authenticated user can insert
-- (options are created together with their parent poll)
create policy "options_select_all" on options
  for select using (true);
create policy "options_insert_authenticated" on options
  for insert with check (auth.role() = 'authenticated');

-- votes: anyone can read, only the voter can insert as themselves
create policy "votes_select_all" on votes
  for select using (true);
create policy "votes_insert_own" on votes
  for insert with check (auth.uid() = user_id);

-- comments: anyone can read, only the author can insert as themselves
create policy "comments_select_all" on comments
  for select using (true);
create policy "comments_insert_own" on comments
  for insert with check (auth.uid() = author_id);

-- =========================================
-- 3. Auto-create a profile row on signup
-- =========================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- The trigger runs as the internal supabase_auth_admin role during signup,
-- which needs explicit grants to write into public.profiles.
grant usage on schema public to supabase_auth_admin;
grant insert on public.profiles to supabase_auth_admin;
