-- Adds optional image/video attachments to polls.
-- Files live in Supabase Storage; polls just store a URL + type pointer.

insert into storage.buckets (id, name, public)
values ('poll-media', 'poll-media', true)
on conflict (id) do nothing;

-- Anyone can read (bucket is public, feed renders media without auth)
create policy "poll_media_select_all" on storage.objects
  for select using (bucket_id = 'poll-media');

-- Users can only upload into a folder named after their own user id,
-- e.g. poll-media/<user.id>/<uuid>.mp4 — never trust the client without
-- verifying ownership, same principle as the option-ownership check on votes.
create policy "poll_media_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'poll-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

alter table polls add column media_url text;
alter table polls add column media_type text check (media_type in ('image', 'video'));
