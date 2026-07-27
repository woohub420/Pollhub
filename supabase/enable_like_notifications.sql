-- Adds 'like' as a notification type, plus a per-user toggle for it.

-- The original notifications.type check only allowed ('comment', 'reply');
-- 'vote' and 'follow' notifications were already being inserted by the app
-- without ever having been added to the constraint. Widen it to match reality
-- and add 'like'.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications
  add constraint notifications_type_check
  check (type in ('vote', 'like', 'follow', 'comment', 'reply'));

alter table notification_settings add column if not exists notify_like boolean not null default true;

notify pgrst, 'reload schema';
