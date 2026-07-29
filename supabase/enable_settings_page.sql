-- Backs the unified Settings page: theme preference on the profile.

alter table profiles add column if not exists theme text not null default 'dark' check (theme in ('dark', 'light'));

notify pgrst, 'reload schema';
