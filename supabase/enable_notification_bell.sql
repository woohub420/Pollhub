-- Widens the notifications.type check to also allow 'vote' and 'follow',
-- since enable_comment_replies.sql only allowed 'comment' and 'reply'.

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('comment', 'reply', 'vote', 'follow'));

-- Required for the NotificationBell's realtime subscription to receive
-- INSERT events on this table. Supabase adds new tables to this publication
-- automatically, so this is a no-op (guarded) if it's already there.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

notify pgrst, 'reload schema';
