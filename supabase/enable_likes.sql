-- Adds like/unlike on polls, with realtime count updates on PollCard.

create table if not exists likes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid references polls(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);

alter table likes enable row level security;

drop policy if exists "likes_select_all" on likes;
create policy "likes_select_all" on likes
  for select using (true);

drop policy if exists "likes_insert_own" on likes;
create policy "likes_insert_own" on likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on likes;
create policy "likes_delete_own" on likes
  for delete using (auth.uid() = user_id);

-- Required for PollCard's realtime subscription to receive like INSERT/DELETE
-- events. Supabase adds new tables to this publication automatically, so
-- this is a no-op (guarded) if likes is already there.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'likes'
  ) then
    alter publication supabase_realtime add table likes;
  end if;
end $$;

notify pgrst, 'reload schema';
