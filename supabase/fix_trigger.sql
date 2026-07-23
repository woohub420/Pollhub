-- Fixes "Database error saving new user" on signup.
-- The trigger runs as the supabase_auth_admin role, which needs an explicit
-- search_path and grants to reliably write into public.profiles.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

grant usage on schema public to supabase_auth_admin;
grant insert on public.profiles to supabase_auth_admin;
