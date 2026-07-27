-- Per-user toggles for which notification types they want to receive.

create table if not exists notification_settings (
  user_id        uuid primary key references profiles(id) on delete cascade,
  notify_vote    boolean not null default true,
  notify_follow  boolean not null default true,
  notify_comment boolean not null default true,
  notify_reply   boolean not null default true
);

alter table notification_settings enable row level security;

drop policy if exists "notification_settings_select_own" on notification_settings;
create policy "notification_settings_select_own" on notification_settings
  for select using (auth.uid() = user_id);

drop policy if exists "notification_settings_insert_own" on notification_settings;
create policy "notification_settings_insert_own" on notification_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "notification_settings_update_own" on notification_settings;
create policy "notification_settings_update_own" on notification_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
