-- Tracks poll views so authors can see view counts on their own profile.
-- viewer_id is null for anonymous (logged-out) viewers — Postgres treats
-- each null as distinct for uniqueness, so anonymous views are never
-- deduplicated, only a logged-in viewer's repeat visits are.

create table if not exists poll_views (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid references polls(id) on delete cascade not null,
  viewer_id  uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(poll_id, viewer_id)
);

alter table poll_views enable row level security;

drop policy if exists "poll_views_select_all" on poll_views;
create policy "poll_views_select_all" on poll_views
  for select using (true);

-- Anonymous viewers have no auth.uid(), so allow viewer_id null inserts too.
-- Never trust the client to name a different viewer_id than their own.
drop policy if exists "poll_views_insert_own" on poll_views;
create policy "poll_views_insert_own" on poll_views
  for insert with check (viewer_id is null or auth.uid() = viewer_id);

notify pgrst, 'reload schema';
