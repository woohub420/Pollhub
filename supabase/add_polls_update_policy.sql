-- Fixes silent failure: uploading poll media succeeded, but attaching it to the
-- poll row via `update` on polls was silently blocked by RLS (0 rows affected,
-- no error) because polls only had SELECT and INSERT policies, never UPDATE.

create policy "polls_update_own" on polls
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Backfill the poll that already has its file uploaded but no media_url set
update polls
set media_url = 'https://vrqwvipfcjdlqgycnhof.supabase.co/storage/v1/object/public/poll-media/ec235c0e-eb04-4959-8eba-4b2332ac3753/15674b76-c576-4cb4-a2ba-a9e33214311c.png',
    media_type = 'image'
where id = '90c4a211-55e6-4836-b6b9-5e7f6bba28ea';
