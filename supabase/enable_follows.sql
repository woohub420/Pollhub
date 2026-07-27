-- Adds a follow/unfollow relationship between profiles, for public user profile pages.

create table if not exists follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at   timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

alter table follows enable row level security;

drop policy if exists "follows_select_all" on follows;
create policy "follows_select_all" on follows
  for select using (true);

drop policy if exists "follows_insert_own" on follows;
create policy "follows_insert_own" on follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_own" on follows;
create policy "follows_delete_own" on follows
  for delete using (auth.uid() = follower_id);

notify pgrst, 'reload schema';
