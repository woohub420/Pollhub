-- notifications.read was missing, likely because the table already existed
-- from an earlier partial run before "create table if not exists" silently
-- skipped adding it. Add it directly.
alter table notifications add column if not exists read boolean not null default false;

notify pgrst, 'reload schema';
