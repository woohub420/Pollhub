-- Poll expiry, plus realtime vote counts.

alter table polls add column if not exists expires_at timestamptz;

-- vote_before_see was added and then removed in the same session — drop it
-- if this file was already run once before this edit.
alter table polls drop column if exists vote_before_see;

-- Required for PollCard's realtime subscription to receive vote INSERT
-- events. Supabase adds new tables to this publication automatically, so
-- this is a no-op (guarded) if votes is already there.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'votes'
  ) then
    alter publication supabase_realtime add table votes;
  end if;
end $$;

notify pgrst, 'reload schema';
