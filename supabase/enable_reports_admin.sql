-- Adds a report system + admin moderation dashboard.

alter table profiles add column if not exists is_admin boolean not null default false;

create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references profiles(id) on delete cascade not null,
  poll_id      uuid references polls(id) on delete cascade,
  comment_id   uuid references comments(id) on delete cascade,
  reason       text not null check (reason in ('spam', 'hate_speech', 'misinformation', 'nsfw', 'other')),
  note         text,
  status       text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at   timestamptz default now()
);

alter table reports enable row level security;

drop policy if exists "reports_insert_own" on reports;
create policy "reports_insert_own" on reports
  for insert with check (auth.uid() = reporter_id);

-- Only admins can see or act on reports — never expose who reported what to
-- the reported user or the general public.
drop policy if exists "reports_select_admin_only" on reports;
create policy "reports_select_admin_only" on reports
  for select using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

drop policy if exists "reports_update_admin_only" on reports;
create policy "reports_update_admin_only" on reports
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

-- polls/comments never had a DELETE policy at all — needed for both the
-- admin dashboard's moderation actions and PollCard's admin quick-delete.
drop policy if exists "polls_delete_admin" on polls;
create policy "polls_delete_admin" on polls
  for delete using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

drop policy if exists "comments_delete_admin" on comments;
create policy "comments_delete_admin" on comments
  for delete using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

-- Authors can also delete their own poll/comment, independent of admin status.
drop policy if exists "polls_delete_own" on polls;
create policy "polls_delete_own" on polls
  for delete using (auth.uid() = author_id);

drop policy if exists "comments_delete_own" on comments;
create policy "comments_delete_own" on comments
  for delete using (auth.uid() = author_id);

notify pgrst, 'reload schema';

-- To make yourself an admin, run this separately (replace with your username):
-- update profiles set is_admin = true where username = 'your_username_here';
