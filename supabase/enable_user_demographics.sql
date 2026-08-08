-- Adds optional, self-reported demographics used only to show anonymous,
-- aggregated poll breakdowns (age group / gender). Never exposed per-vote.

create table if not exists user_demographics (
  user_id     uuid primary key references profiles(id) on delete cascade,
  birth_year  int check (birth_year between 1900 and extract(year from now())::int - 13),
  gender      text check (gender in ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table user_demographics enable row level security;

drop policy if exists demographics_select_own on user_demographics;
create policy demographics_select_own on user_demographics
  for select using (auth.uid() = user_id);

drop policy if exists demographics_insert_own on user_demographics;
create policy demographics_insert_own on user_demographics
  for insert with check (auth.uid() = user_id);

drop policy if exists demographics_update_own on user_demographics;
create policy demographics_update_own on user_demographics
  for update using (auth.uid() = user_id);

-- Aggregated age breakdown for a poll. SECURITY DEFINER bypasses the
-- owner-only RLS above on purpose — this is the only path allowed to read
-- across users, and it only ever returns rounded percentages, never rows.
-- Suppresses the whole result below 20 total votes, and folds any age
-- bucket under 10 voters into "Other" so it can't be inferred by omission.
create or replace function get_poll_age_breakdown(p_poll_id uuid)
returns table(age_group text, pct numeric, voter_count bigint)
language sql
security definer
set search_path = public
as $$
  with voter_ages as (
    select
      case
        when (extract(year from now())::int - d.birth_year) between 13 and 17 then '13-17'
        when (extract(year from now())::int - d.birth_year) between 18 and 24 then '18-24'
        when (extract(year from now())::int - d.birth_year) between 25 and 34 then '25-34'
        when (extract(year from now())::int - d.birth_year) between 35 and 44 then '35-44'
        else '45+'
      end as bucket
    from votes v
    join user_demographics d on d.user_id = v.user_id
    where v.poll_id = p_poll_id
      and d.birth_year is not null
  ),
  total as (
    select count(*) as n from votes where poll_id = p_poll_id
  ),
  bucketed as (
    select bucket, count(*) as n from voter_ages group by bucket
  ),
  folded as (
    select
      case when n >= 10 then bucket else 'Other' end as age_group,
      n
    from bucketed
  )
  select
    f.age_group,
    round(100.0 * sum(f.n) / t.n, 1) as pct,
    sum(f.n) as voter_count
  from folded f, total t
  where t.n >= 20
  group by f.age_group, t.n;
$$;

-- Aggregated gender breakdown for a poll. Same thresholds and folding logic.
create or replace function get_poll_gender_breakdown(p_poll_id uuid)
returns table(gender_group text, pct numeric, voter_count bigint)
language sql
security definer
set search_path = public
as $$
  with voter_genders as (
    select d.gender as bucket
    from votes v
    join user_demographics d on d.user_id = v.user_id
    where v.poll_id = p_poll_id
      and d.gender is not null
  ),
  total as (
    select count(*) as n from votes where poll_id = p_poll_id
  ),
  bucketed as (
    select bucket, count(*) as n from voter_genders group by bucket
  ),
  folded as (
    select
      case when n >= 10 then bucket else 'other' end as gender_group,
      n
    from bucketed
  )
  select
    f.gender_group,
    round(100.0 * sum(f.n) / t.n, 1) as pct,
    sum(f.n) as voter_count
  from folded f, total t
  where t.n >= 20
  group by f.gender_group, t.n;
$$;

grant execute on function get_poll_age_breakdown(uuid) to anon, authenticated;
grant execute on function get_poll_gender_breakdown(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
