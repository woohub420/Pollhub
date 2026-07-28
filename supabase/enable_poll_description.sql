-- Optional longer-form description, shown only on the poll detail page.

alter table polls add column if not exists description text;

notify pgrst, 'reload schema';
