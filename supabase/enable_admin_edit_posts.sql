-- Lets admins (profiles.is_admin = true) edit ANY user's poll: question,
-- description, category, options, and media. Profile avatar editing reuses
-- the profiles_update_admin policy already added in enable_user_bans.sql —
-- nothing more needed there for the "avatar_url" column itself.
--
-- Run this whole file once in the Supabase SQL editor.

-- polls: admin can update any poll (author ownership still applies to
-- everyone else via the existing polls_update_own policy).
drop policy if exists "polls_update_admin" on polls;
create policy "polls_update_admin" on polls
  for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- options: no one — not even the poll's own author — could previously
-- update or delete options after creation. Admin editing needs all three
-- (update existing labels, delete removed options, insert newly added ones).
drop policy if exists "options_update_admin" on options;
create policy "options_update_admin" on options
  for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "options_delete_admin" on options;
create policy "options_delete_admin" on options
  for delete using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- options_insert_authenticated already lets any authenticated user insert
-- options (unchanged) — admin edits ride on that existing policy.

-- poll_media: same gap — poll_media only ever had select + insert-by-owner.
-- Admin editing needs to remove old attachments and add replacements.
drop policy if exists "poll_media_delete_admin" on poll_media;
create policy "poll_media_delete_admin" on poll_media
  for delete using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "poll_media_insert_admin" on poll_media;
create policy "poll_media_insert_admin" on poll_media
  for insert with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- storage: admin uploads for a poll they don't own still land in the
-- admin's OWN storage folder (poll-media/<admin.id>/...), which the
-- existing poll_media_insert_own_folder policy already allows — no storage
-- change needed there.
--
-- Avatars are different: overwriting another user's avatar means writing
-- into THEIR folder (avatars/<their-id>/avatar.ext), which an own-folder-only
-- policy would block. The avatars bucket's existing policies were set up
-- directly in the Supabase dashboard (not tracked in this repo), so these
-- are ADDITIVE — they won't conflict with whatever's already there, but
-- double check in Storage > Policies that no other restrictive policy
-- still blocks this after running this file.
drop policy if exists "avatars_admin_insert" on storage.objects;
create policy "avatars_admin_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

drop policy if exists "avatars_admin_update" on storage.objects;
create policy "avatars_admin_update" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

notify pgrst, 'reload schema';
