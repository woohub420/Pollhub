-- Allows Google OAuth sign-ins to create a profile row before a username is chosen.
-- Postgres permits multiple NULLs in a UNIQUE column, so uniqueness is unaffected
-- once a user picks a username via the CompleteProfileModal.

alter table profiles alter column username drop not null;
