-- Bonus server-side cleanup — the real fix (hiding old notifications from the
-- bell) is the .gte('created_at', ...) filter added to NotificationBell.jsx's
-- fetchNotifications(). This just keeps the table itself from growing forever.
-- Requires the pg_cron extension, which isn't enabled by default.

create extension if not exists pg_cron;

create or replace function delete_old_notifications()
returns void as $$
begin
  delete from notifications
  where created_at < now() - interval '7 days';
end;
$$ language plpgsql security definer set search_path = public;

select cron.schedule(
  'delete-old-notifications',
  '0 0 * * *',
  'select delete_old_notifications()'
)
where not exists (
  select 1 from cron.job where jobname = 'delete-old-notifications'
);
