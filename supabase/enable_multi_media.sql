-- Upgrades polls from a single optional image/video to up to 4 images OR 1 video.
-- Old polls.media_url / polls.media_type columns are kept (read-only now) so
-- nothing breaks; new uploads go into this table instead.
-- Written to be safe to re-run if an earlier attempt partially applied.

create table if not exists poll_media (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid references polls(id) on delete cascade not null,
  url         text not null,
  media_type  text not null check (media_type in ('image', 'video')),
  position    int not null default 0,
  created_at  timestamptz default now()
);

alter table poll_media enable row level security;

drop policy if exists "poll_media_select_all" on poll_media;
create policy "poll_media_select_all" on poll_media
  for select using (true);

-- Only the poll's author can attach media to it, same ownership pattern as
-- everywhere else — never trust the client's poll_id without checking who
-- actually owns that poll.
drop policy if exists "poll_media_insert_own_poll" on poll_media;
create policy "poll_media_insert_own_poll" on poll_media
  for insert with check (
    exists (
      select 1 from polls
      where polls.id = poll_media.poll_id
      and polls.author_id = auth.uid()
    )
  );

-- Carry forward any poll that already had the old single media_url set.
insert into poll_media (poll_id, url, media_type, position)
select id, media_url, media_type, 0
from polls
where media_url is not null
and not exists (select 1 from poll_media where poll_media.poll_id = polls.id);

notify pgrst, 'reload schema';
