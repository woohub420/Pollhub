-- Ban/unban system for the admin dashboard.
--
-- IMPORTANT: profiles' existing UPDATE policy (`using (auth.uid() = id)`) only
-- checks row ownership, not which columns are being changed. Without the
-- trigger below, any logged-in user could run
-- `supabase.from('profiles').update({ is_admin: true }).eq('id', user.id)`
-- and self-promote to admin — and once is_banned/ban_reason exist, could
-- just as easily un-ban themselves the same way. RLS alone can't express
-- "this column may only change if the caller is already an admin" without
-- comparing old vs new values, so this uses a trigger instead.

alter table profiles add column if not exists is_banned boolean not null default false;
alter table profiles add column if not exists ban_reason text;

-- Lets admins target rows other than their own — the existing
-- profiles_update_own policy only ever allows auth.uid() = id.
drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles
  for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- Silently clamps is_admin/is_banned/ban_reason back to their stored values
-- for anyone who isn't currently an admin, no matter which RLS policy let
-- the row-level update through.
create or replace function protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    new.is_admin := old.is_admin;
    new.is_banned := old.is_banned;
    new.ban_reason := old.ban_reason;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_columns_trigger on profiles;
create trigger protect_privileged_profile_columns_trigger
  before update on profiles
  for each row execute procedure protect_privileged_profile_columns();

-- Defense in depth: block a banned user's writes at the DB level too, not
-- just via the client-side sign-out on login — a session that was already
-- open when the ban happened would otherwise keep working until it expires.
create or replace function current_user_is_banned()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_banned from profiles where id = auth.uid()), false);
$$;

drop policy if exists "polls_insert_own" on polls;
create policy "polls_insert_own" on polls
  for insert with check (auth.uid() = author_id and not current_user_is_banned());

drop policy if exists "comments_insert_own" on comments;
create policy "comments_insert_own" on comments
  for insert with check (auth.uid() = author_id and not current_user_is_banned());

drop policy if exists "votes_insert_own" on votes;
create policy "votes_insert_own" on votes
  for insert with check (auth.uid() = user_id and not current_user_is_banned());

drop policy if exists "likes_insert_own" on likes;
create policy "likes_insert_own" on likes
  for insert with check (auth.uid() = user_id and not current_user_is_banned());

notify pgrst, 'reload schema';
