-- Adds reply threading to comments, and a notifications table for
-- "someone commented on your poll" / "someone replied to your comment".

alter table comments add column if not exists parent_id uuid references comments(id) on delete cascade;

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null, -- who receives it
  actor_id    uuid references profiles(id) on delete cascade not null, -- who triggered it
  type        text not null check (type in ('comment', 'reply')),
  poll_id     uuid references polls(id) on delete cascade,
  comment_id  uuid references comments(id) on delete cascade,
  read        boolean not null default false,
  created_at  timestamptz default now()
);

alter table notifications enable row level security;

drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications
  for select using (auth.uid() = user_id);

-- Any authenticated user can create a notification, but only naming
-- themselves as the actor — never trust the client to say who triggered it.
drop policy if exists "notifications_insert_as_actor" on notifications;
create policy "notifications_insert_as_actor" on notifications
  for insert with check (auth.uid() = actor_id);

drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
