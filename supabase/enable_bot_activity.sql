-- Controlled activity for the 10 automated persona accounts created on 2026-08-18.
-- The allowlist is explicit, all bot-facing tables are private, and each run is
-- rate-limited so automated activity cannot flood the feed.

alter table profiles add column if not exists is_bot boolean not null default false;

-- Prevent normal users from changing the automation label on their own profile.
create or replace function protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null
    and not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    new.is_admin := old.is_admin;
    new.is_banned := old.is_banned;
    new.ban_reason := old.ban_reason;
    new.is_bot := old.is_bot;
  end if;
  return new;
end;
$$;

create table if not exists bot_accounts (
  user_id          uuid primary key references profiles(id) on delete cascade,
  primary_category text not null references categories(name),
  enabled          boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists bot_poll_queue (
  id                uuid primary key default gen_random_uuid(),
  bot_id            uuid not null references bot_accounts(user_id) on delete cascade,
  question          text not null check (char_length(question) between 1 and 200),
  description       text,
  category          text not null references categories(name),
  option_labels     text[] not null check (cardinality(option_labels) between 2 and 6),
  published_poll_id uuid unique references polls(id) on delete set null,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique(bot_id, question)
);

create table if not exists bot_comment_templates (
  id         uuid primary key default gen_random_uuid(),
  bot_id     uuid not null references bot_accounts(user_id) on delete cascade,
  category   text not null references categories(name),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  unique(bot_id, body)
);

create table if not exists bot_activity_log (
  id          bigint generated always as identity primary key,
  bot_id      uuid references bot_accounts(user_id) on delete set null,
  action_type text not null check (action_type in ('poll', 'vote', 'like', 'comment', 'follow')),
  target_id   uuid,
  created_at  timestamptz not null default now()
);

create table if not exists bot_activity_state (
  id          boolean primary key default true check (id),
  last_run_at timestamptz,
  last_result jsonb not null default '{}'::jsonb
);

insert into bot_activity_state (id) values (true) on conflict (id) do nothing;

alter table bot_accounts enable row level security;
alter table bot_poll_queue enable row level security;
alter table bot_comment_templates enable row level security;
alter table bot_activity_log enable row level security;
alter table bot_activity_state enable row level security;

-- No public policies are created for automation tables. Only the database
-- owner/service role and the SECURITY DEFINER scheduler function can access them.

insert into bot_accounts (user_id, primary_category)
select id,
  case username
    when 'maya_mortgage_advisor' then 'finance'
    when 'daniel_career_coach' then 'career'
    when 'priya_education_research' then 'education'
    when 'elena_registered_dietitian' then 'food'
    when 'marcus_physiotherapist' then 'fitness'
    when 'aisha_cybersecurity' then 'tech'
    when 'noah_small_business' then 'startup'
    when 'sophie_mental_health' then 'life'
    when 'lucas_sustainability' then 'nature'
    when 'zoe_travel_researcher' then 'travel'
  end
from profiles
where username in (
  'maya_mortgage_advisor',
  'daniel_career_coach',
  'priya_education_research',
  'elena_registered_dietitian',
  'marcus_physiotherapist',
  'aisha_cybersecurity',
  'noah_small_business',
  'sophie_mental_health',
  'lucas_sustainability',
  'zoe_travel_researcher'
)
on conflict (user_id) do update
set primary_category = excluded.primary_category,
    enabled = true;

update profiles
set is_bot = true
where id in (select user_id from bot_accounts);

insert into bot_poll_queue (bot_id, question, description, category, option_labels)
select p.id, seed.question, seed.description, seed.category, seed.option_labels
from (
  values
    ('maya_mortgage_advisor', 'Which mortgage feature would give you the most peace of mind?', 'Assume the monthly payment is otherwise affordable. Which feature matters most?', 'finance', array['A fixed interest rate', 'Flexible extra payments', 'A longer rate hold', 'The lowest possible fees']),
    ('daniel_career_coach', 'Which part of a job interview is hardest to prepare for?', 'Think about the stage that creates the most uncertainty for you.', 'career', array['Talking about accomplishments', 'Answering behavioural questions', 'Discussing salary', 'Asking the interviewer questions']),
    ('priya_education_research', 'What kind of feedback helps you learn most effectively?', 'Choose the format that most often helps you improve on the next attempt.', 'education', array['Detailed written notes', 'A live conversation', 'Examples of strong work', 'A score with a rubric']),
    ('elena_registered_dietitian', 'Which grocery-planning habit would be easiest for you to maintain?', 'This is about practical routines, not a perfect diet.', 'food', array['A reusable shopping list', 'Planning three dinners', 'Buying the same staples weekly', 'Ordering groceries online']),
    ('marcus_physiotherapist', 'What most helps you stay consistent with physical activity?', 'Choose the factor that makes the biggest difference during a normal month.', 'fitness', array['A scheduled routine', 'An activity I enjoy', 'A workout partner', 'Tracking progress']),
    ('aisha_cybersecurity', 'Which online-security task have you been putting off?', 'Pick the one you know would help but still have not completed.', 'tech', array['Using a password manager', 'Enabling two-factor authentication', 'Updating old passwords', 'Reviewing app permissions']),
    ('noah_small_business', 'Which recurring task takes the most time in a small business?', 'Think about work that repeats every week or month.', 'startup', array['Bookkeeping and invoices', 'Finding new customers', 'Scheduling and email', 'Hiring and training']),
    ('sophie_mental_health', 'Which small habit best protects your energy during a busy week?', 'Choose the one that is most realistic for you, not the ideal answer.', 'life', array['Keeping a regular bedtime', 'Taking short breaks', 'Saying no to extra plans', 'Spending time outside']),
    ('lucas_sustainability', 'Which lower-waste habit feels most realistic to keep long term?', 'Focus on the change that would fit your current routine.', 'nature', array['Buying fewer new items', 'Repairing before replacing', 'Reducing food waste', 'Using reusable containers']),
    ('zoe_travel_researcher', 'What do you research first when planning a new trip?', 'Choose the first detail you usually investigate after picking a destination.', 'travel', array['Flight prices', 'Where to stay', 'Weather and timing', 'Things to do'])
) as seed(username, question, description, category, option_labels)
join profiles p on p.username = seed.username
on conflict (bot_id, question) do nothing;

insert into bot_comment_templates (bot_id, category, body)
select p.id, seed.category, seed.body
from (
  values
    ('maya_mortgage_advisor', 'startup', 'Cash flow can make even a good business idea difficult to sustain, so the practical trade-offs matter here.'),
    ('maya_mortgage_advisor', 'startup', 'I wonder whether owners with employees answer this differently from people working alone.'),
    ('daniel_career_coach', 'education', 'Being able to explain what you learned is often just as useful as completing the lesson itself.'),
    ('daniel_career_coach', 'education', 'I would be interested to compare answers from current students and people changing careers.'),
    ('priya_education_research', 'career', 'Clear examples and timely feedback can make this much easier to navigate.'),
    ('priya_education_research', 'career', 'The answer may change quite a bit between someone entering the workforce and someone more established.'),
    ('elena_registered_dietitian', 'fitness', 'Time and energy often shape routines more than knowing what the ideal plan looks like.'),
    ('elena_registered_dietitian', 'fitness', 'I like that this focuses on what people can realistically maintain during a normal week.'),
    ('marcus_physiotherapist', 'life', 'Small changes people can repeat comfortably often matter more than an ambitious short-term plan.'),
    ('marcus_physiotherapist', 'life', 'Consistency looks different for everyone, so the spread of answers is useful.'),
    ('aisha_cybersecurity', 'finance', 'Convenience and risk can pull in opposite directions more often than people expect.'),
    ('aisha_cybersecurity', 'finance', 'I would be interested to see whether a recent bad experience changes how people answer this.'),
    ('noah_small_business', 'tech', 'Tools that remove repetitive work can have a bigger impact than their headline features suggest.'),
    ('noah_small_business', 'tech', 'The time cost is easy to underestimate when a task is spread across the whole week.'),
    ('sophie_mental_health', 'food', 'The most realistic option is often more valuable than the theoretically perfect one.'),
    ('sophie_mental_health', 'food', 'I appreciate questions that leave room for different routines and circumstances.'),
    ('lucas_sustainability', 'travel', 'Cost and convenience probably explain a lot of the gap between intention and action here.'),
    ('lucas_sustainability', 'travel', 'The environmental trade-offs may look very different for a short trip versus a long one.'),
    ('zoe_travel_researcher', 'nature', 'Where someone lives probably changes which of these choices feels practical.'),
    ('zoe_travel_researcher', 'nature', 'I would be curious whether frequent travellers prioritize this differently from people who travel occasionally.')
) as seed(username, category, body)
join profiles p on p.username = seed.username
on conflict (bot_id, body) do nothing;

create or replace function run_bot_activity()
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_last_run timestamptz;
  v_bot_id uuid;
  v_poll_id uuid;
  v_option_id uuid;
  v_template_id uuid;
  v_body text;
  v_queue bot_poll_queue%rowtype;
  v_new_poll_id uuid;
  v_votes integer := 0;
  v_likes integer := 0;
  v_comments integer := 0;
  v_follows integer := 0;
  v_polls integer := 0;
  v_result jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('pollhub_bot_activity')) then
    return jsonb_build_object('status', 'skipped', 'reason', 'already_running');
  end if;

  select last_run_at into v_last_run
  from bot_activity_state
  where id = true
  for update;

  if v_last_run is not null and v_last_run > now() - interval '4 hours' then
    return jsonb_build_object('status', 'skipped', 'reason', 'rate_limited', 'last_run_at', v_last_run);
  end if;

  update bot_activity_state set last_run_at = now() where id = true;

  -- Publish no more than one queued poll every 72 hours across the whole bot group.
  if not exists (
    select 1 from polls
    where author_id in (select user_id from bot_accounts where enabled)
      and created_at > now() - interval '72 hours'
  ) then
    select q.* into v_queue
    from bot_poll_queue q
    join bot_accounts b on b.user_id = q.bot_id and b.enabled
    where q.published_at is null
    order by random()
    limit 1
    for update of q skip locked;

    if found then
      insert into polls (question, description, category, author_id)
      values (v_queue.question, v_queue.description, v_queue.category, v_queue.bot_id)
      returning id into v_new_poll_id;

      insert into options (poll_id, label, position)
      select v_new_poll_id, item.label, item.ordinality - 1
      from unnest(v_queue.option_labels) with ordinality as item(label, ordinality);

      update bot_poll_queue
      set published_poll_id = v_new_poll_id, published_at = now()
      where id = v_queue.id;

      insert into bot_activity_log (bot_id, action_type, target_id)
      values (v_queue.bot_id, 'poll', v_new_poll_id);
      v_polls := 1;
    end if;
  end if;

  -- Two votes per run, always on another automated account's active poll.
  for i in 1..2 loop
    select b.user_id, p.id
    into v_bot_id, v_poll_id
    from bot_accounts b
    join polls p
      on p.author_id in (select user_id from bot_accounts where enabled)
     and p.author_id <> b.user_id
    where b.enabled
      and (p.expires_at is null or p.expires_at > now())
      and not exists (
        select 1 from votes v where v.poll_id = p.id and v.user_id = b.user_id
      )
    order by random()
    limit 1;

    if found then
      select id into v_option_id
      from options
      where poll_id = v_poll_id
      order by random()
      limit 1;

      if v_option_id is not null then
        insert into votes (poll_id, option_id, user_id)
        values (v_poll_id, v_option_id, v_bot_id)
        on conflict (poll_id, user_id) do nothing;

        if found then
          insert into bot_activity_log (bot_id, action_type, target_id)
          values (v_bot_id, 'vote', v_poll_id);
          v_votes := v_votes + 1;
        end if;
      end if;
    end if;
  end loop;

  -- One like per run, limited to automated accounts' polls.
  select b.user_id, p.id
  into v_bot_id, v_poll_id
  from bot_accounts b
  join polls p
    on p.author_id in (select user_id from bot_accounts where enabled)
   and p.author_id <> b.user_id
  where b.enabled
    and not exists (
      select 1 from likes l where l.poll_id = p.id and l.user_id = b.user_id
    )
  order by random()
  limit 1;

  if found then
    insert into likes (poll_id, user_id)
    values (v_poll_id, v_bot_id)
    on conflict (poll_id, user_id) do nothing;

    if found then
      insert into bot_activity_log (bot_id, action_type, target_id)
      values (v_bot_id, 'like', v_poll_id);
      v_likes := 1;
    end if;
  end if;

  -- One category-matched comment per run. A bot never comments twice on one poll.
  select t.id, t.bot_id, p.id, t.body
  into v_template_id, v_bot_id, v_poll_id, v_body
  from bot_comment_templates t
  join bot_accounts b on b.user_id = t.bot_id and b.enabled
  join polls p
    on p.category = t.category
   and p.author_id in (select user_id from bot_accounts where enabled)
   and p.author_id <> t.bot_id
  where not exists (
    select 1 from comments c where c.poll_id = p.id and c.author_id = t.bot_id
  )
  order by random()
  limit 1;

  if found then
    insert into comments (poll_id, author_id, body)
    values (v_poll_id, v_bot_id, v_body);

    insert into bot_activity_log (bot_id, action_type, target_id)
    values (v_bot_id, 'comment', v_poll_id);
    v_comments := 1;
  end if;

  -- One new follow relationship per run, only between automated accounts.
  select follower.user_id, followed.user_id
  into v_bot_id, v_poll_id
  from bot_accounts follower
  cross join bot_accounts followed
  where follower.enabled
    and followed.enabled
    and follower.user_id <> followed.user_id
    and not exists (
      select 1 from follows f
      where f.follower_id = follower.user_id and f.following_id = followed.user_id
    )
  order by random()
  limit 1;

  if found then
    insert into follows (follower_id, following_id)
    values (v_bot_id, v_poll_id)
    on conflict (follower_id, following_id) do nothing;

    if found then
      insert into bot_activity_log (bot_id, action_type, target_id)
      values (v_bot_id, 'follow', v_poll_id);
      v_follows := 1;
    end if;
  end if;

  v_result := jsonb_build_object(
    'status', 'completed',
    'polls', v_polls,
    'votes', v_votes,
    'likes', v_likes,
    'comments', v_comments,
    'follows', v_follows,
    'ran_at', now()
  );

  update bot_activity_state set last_result = v_result where id = true;
  return v_result;
end;
$$;

revoke all on function run_bot_activity() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'pollhub-bot-activity';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'pollhub-bot-activity',
    '15 */6 * * *',
    'select public.run_bot_activity()'
  );
end;
$$;

-- Start with one small batch immediately; the internal guard prevents retries.
select run_bot_activity();

notify pgrst, 'reload schema';
