-- User-created categories (communities) with follow system.

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

alter table categories enable row level security;

drop policy if exists "categories_select_all" on categories;
create policy "categories_select_all" on categories
  for select using (true);

drop policy if exists "categories_insert_authenticated" on categories;
create policy "categories_insert_authenticated" on categories
  for insert with check (auth.uid() = created_by);

create table if not exists category_follows (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(user_id, category_id)
);

alter table category_follows enable row level security;

drop policy if exists "category_follows_select_all" on category_follows;
create policy "category_follows_select_all" on category_follows
  for select using (true);

drop policy if exists "category_follows_insert_own" on category_follows;
create policy "category_follows_insert_own" on category_follows
  for insert with check (auth.uid() = user_id);

drop policy if exists "category_follows_delete_own" on category_follows;
create policy "category_follows_delete_own" on category_follows
  for delete using (auth.uid() = user_id);

-- Seed the 5 categories that already existed as a hardcoded list
-- (src/lib/constants.js CATEGORIES) so /c/:slug and existing polls keep working.
insert into categories (name, slug)
values ('tech', 'tech'), ('life', 'life'), ('finance', 'finance'), ('gaming', 'gaming'), ('other', 'other')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
