-- notifications was never added to the realtime publication, so
-- NotificationBell's INSERT subscription never fired — new notifications
-- only ever showed up after a manual page refresh.

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
