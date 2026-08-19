-- Schedule exactly eight automated polls in each fixed three-day window.
-- Authors and posting times are randomized, while a 14-day prompt cooldown
-- prevents the recurring content pool from repeating too frequently.

alter table bot_poll_queue add column if not exists scheduled_at timestamptz;
alter table bot_poll_queue add column if not exists schedule_window_start timestamptz;
alter table bot_poll_queue add column if not exists last_published_at timestamptz;
alter table bot_poll_queue add column if not exists publication_count integer not null default 0;

create index if not exists bot_poll_queue_scheduled_at_idx
  on bot_poll_queue (scheduled_at)
  where scheduled_at is not null;

insert into bot_poll_queue (bot_id, question, description, category, option_labels)
select p.id, seed.question, seed.description, seed.category, seed.option_labels
from (
  values
    ('maya_mortgage_advisor', 'What is your biggest concern about renewing a mortgage?', 'Choose the issue you would want clarity on first.', 'finance', array['A higher monthly payment', 'Choosing the right term', 'Qualification rules', 'Fees for switching lenders']),
    ('maya_mortgage_advisor', 'How long would you prefer to lock in a mortgage rate?', 'Assume the available rates are reasonably competitive.', 'finance', array['Variable or under 1 year', '1 to 2 years', '3 years', '4 to 5 years']),
    ('maya_mortgage_advisor', 'Which cost of homeownership surprises people most?', 'Think beyond the purchase price and mortgage payment.', 'finance', array['Repairs and maintenance', 'Property taxes', 'Insurance', 'Utilities and services']),

    ('daniel_career_coach', 'What would make you leave an otherwise decent job?', 'Pick the factor most likely to push you to make a change.', 'career', array['Limited growth', 'Poor management', 'Low compensation', 'Lack of flexibility']),
    ('daniel_career_coach', 'Which career skill is hardest to demonstrate on a resume?', 'Choose the quality that is most difficult to communicate in writing.', 'career', array['Leadership', 'Problem solving', 'Communication', 'Adaptability']),
    ('daniel_career_coach', 'How far ahead do you plan your next career move?', 'Choose the answer closest to how you actually approach it.', 'career', array['I do not plan ahead', 'A few months', 'About a year', 'Several years']),

    ('priya_education_research', 'What most improves your focus while learning?', 'Think about a normal study or training session.', 'education', array['A quiet environment', 'Short timed sessions', 'Taking handwritten notes', 'Learning with someone else']),
    ('priya_education_research', 'Which assessment format best shows what you understand?', 'Choose the format that feels most accurate, not necessarily easiest.', 'education', array['A written exam', 'A practical project', 'A presentation', 'An open-book assignment']),
    ('priya_education_research', 'What is the ideal length for an online lesson?', 'Assume the topic can be divided into multiple lessons.', 'education', array['Under 10 minutes', '10 to 20 minutes', '20 to 40 minutes', 'More than 40 minutes']),

    ('elena_registered_dietitian', 'Which meal is hardest for you to plan consistently?', 'Think about a typical weekday rather than a special occasion.', 'food', array['Breakfast', 'Lunch', 'Dinner', 'Snacks']),
    ('elena_registered_dietitian', 'What makes you most likely to try a new recipe?', 'Choose the factor that usually gets you from saving it to cooking it.', 'food', array['Few ingredients', 'Short preparation time', 'Affordable ingredients', 'A strong recommendation']),
    ('elena_registered_dietitian', 'Which kitchen habit saves you the most time?', 'Pick the habit that has the biggest effect during a normal week.', 'food', array['Batch cooking', 'Pre-cut ingredients', 'A planned menu', 'Cleaning as I cook']),

    ('marcus_physiotherapist', 'What most often interrupts your exercise routine?', 'Choose the reason that causes the longest breaks for you.', 'fitness', array['A busy schedule', 'Pain or discomfort', 'Loss of motivation', 'Travel or life changes']),
    ('marcus_physiotherapist', 'Which type of movement is easiest to fit into your day?', 'Choose what feels most practical on a busy weekday.', 'fitness', array['Walking', 'A short home workout', 'Gym training', 'Stretching or mobility']),
    ('marcus_physiotherapist', 'How do you decide when to rest from exercise?', 'Choose the signal you rely on most often.', 'fitness', array['Scheduled rest days', 'Muscle soreness', 'Low energy', 'Pain or reduced movement']),

    ('aisha_cybersecurity', 'Which account would be worst for you to lose access to?', 'Choose the account that would cause the most disruption.', 'tech', array['Primary email', 'Banking', 'Social media', 'Cloud storage']),
    ('aisha_cybersecurity', 'How often do you review privacy settings on your apps?', 'Choose the answer closest to your real routine.', 'tech', array['Never', 'Only after a problem', 'Once or twice a year', 'Every few months']),
    ('aisha_cybersecurity', 'What is your main reason for reusing a password?', 'Choose the practical reason that applies most often.', 'tech', array['Too many accounts', 'Hard to remember new ones', 'The account feels unimportant', 'I do not reuse passwords']),

    ('noah_small_business', 'What is hardest about pricing a new product or service?', 'Choose the part that creates the most uncertainty.', 'startup', array['Estimating costs', 'Understanding competitors', 'Knowing customer willingness to pay', 'Leaving room for profit']),
    ('noah_small_business', 'Which first hire would help a small business most?', 'Assume the owner currently handles nearly everything.', 'startup', array['Sales and marketing', 'Operations', 'Bookkeeping', 'Customer support']),
    ('noah_small_business', 'What keeps a side project from becoming a real business?', 'Choose the barrier that feels hardest to overcome.', 'startup', array['Not enough time', 'Uncertain demand', 'Limited funding', 'Fear of leaving stable work']),

    ('sophie_mental_health', 'What helps you mentally switch off after work?', 'Choose what works most reliably during a normal week.', 'life', array['Exercise or a walk', 'Entertainment', 'Talking with someone', 'Quiet time alone']),
    ('sophie_mental_health', 'Which boundary is hardest for you to maintain?', 'Choose the one that tends to slip first when life gets busy.', 'life', array['Not checking work messages', 'Protecting sleep time', 'Saying no to plans', 'Taking time for myself']),
    ('sophie_mental_health', 'What most improves a difficult day for you?', 'Choose the small change that usually helps first.', 'life', array['Getting outside', 'Finishing one task', 'Talking to someone', 'Resting without guilt']),

    ('lucas_sustainability', 'Which household item do you most often repair instead of replace?', 'Choose the category where repair feels most worthwhile.', 'nature', array['Clothing', 'Electronics', 'Furniture', 'Appliances']),
    ('lucas_sustainability', 'What would most reduce your household food waste?', 'Pick the change that would be easiest to sustain.', 'nature', array['Planning meals', 'Freezing leftovers', 'Buying smaller amounts', 'Organizing the fridge']),
    ('lucas_sustainability', 'Which factor matters most when buying something new?', 'Choose the consideration that most often changes your decision.', 'nature', array['Price', 'Durability', 'Environmental impact', 'Where it was made']),

    ('zoe_travel_researcher', 'Which travel expense is hardest to estimate accurately?', 'Think about the cost most likely to exceed your original plan.', 'travel', array['Transportation', 'Accommodation', 'Food', 'Activities and tickets']),
    ('zoe_travel_researcher', 'How much unplanned time do you prefer on a trip?', 'Choose the balance that makes a trip most enjoyable for you.', 'travel', array['Almost none', 'A few open hours', 'One open day', 'Mostly unplanned']),
    ('zoe_travel_researcher', 'What most influences how long you stay at a destination?', 'Choose the factor that usually sets the trip length.', 'travel', array['Available vacation days', 'Overall cost', 'Number of things to do', 'Travel time to get there'])
) as seed(username, question, description, category, option_labels)
join profiles p on p.username = seed.username
on conflict (bot_id, question) do nothing;

create or replace function schedule_and_publish_bot_polls()
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_epoch constant timestamptz := '2026-08-19 00:00:00+00';
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_random_start timestamptz;
  v_needed integer;
  v_scheduled integer := 0;
  v_added integer := 0;
  v_published integer := 0;
  v_queue bot_poll_queue%rowtype;
  v_new_poll_id uuid;
begin
  if not pg_try_advisory_xact_lock(hashtext('pollhub_bot_posting')) then
    return jsonb_build_object('status', 'skipped', 'reason', 'already_running');
  end if;

  v_window_start := v_epoch
    + floor(extract(epoch from (now() - v_epoch)) / 259200) * interval '3 days';
  v_window_end := v_window_start + interval '3 days';
  v_random_start := greatest(now() + interval '5 minutes', v_window_start + interval '5 minutes');

  select greatest(0, 8 - count(*))::integer
  into v_needed
  from bot_poll_queue
  where schedule_window_start = v_window_start;

  if v_needed > 0 and v_random_start < v_window_end - interval '5 minutes' then
    -- Prefer eight distinct randomly selected authors in each window.
    with ranked as (
      select q.id,
        row_number() over (partition by q.bot_id order by random()) as author_rank
      from bot_poll_queue q
      join bot_accounts b on b.user_id = q.bot_id and b.enabled
      where q.scheduled_at is null
        and (q.last_published_at is null or q.last_published_at < now() - interval '14 days')
        and q.schedule_window_start is distinct from v_window_start
    ), chosen as (
      select id
      from ranked
      where author_rank = 1
      order by random()
      limit v_needed
    )
    update bot_poll_queue q
    set schedule_window_start = v_window_start,
        scheduled_at = v_random_start
          + random() * ((v_window_end - interval '5 minutes') - v_random_start),
        published_at = null
    from chosen
    where q.id = chosen.id;

    get diagnostics v_added = row_count;
    v_scheduled := v_scheduled + v_added;
    v_needed := v_needed - v_added;

    -- Fallback if fewer than eight distinct authors have eligible content.
    if v_needed > 0 then
      with chosen as (
        select q.id
        from bot_poll_queue q
        join bot_accounts b on b.user_id = q.bot_id and b.enabled
        where q.scheduled_at is null
          and (q.last_published_at is null or q.last_published_at < now() - interval '14 days')
          and q.schedule_window_start is distinct from v_window_start
        order by random()
        limit v_needed
      )
      update bot_poll_queue q
      set schedule_window_start = v_window_start,
          scheduled_at = v_random_start
            + random() * ((v_window_end - interval '5 minutes') - v_random_start),
          published_at = null
      from chosen
      where q.id = chosen.id;

      get diagnostics v_added = row_count;
      v_scheduled := v_scheduled + v_added;
    end if;
  end if;

  for v_queue in
    select q.*
    from bot_poll_queue q
    join bot_accounts b on b.user_id = q.bot_id and b.enabled
    where q.scheduled_at is not null
      and q.scheduled_at <= now()
      and q.published_at is null
    order by q.scheduled_at
    for update of q skip locked
  loop
    insert into polls (question, description, category, author_id, created_at)
    values (
      v_queue.question,
      case
        when v_queue.publication_count > 0
          then concat_ws(' ', v_queue.description, 'Recurring automated community check-in.')
        else v_queue.description
      end,
      v_queue.category,
      v_queue.bot_id,
      greatest(v_queue.scheduled_at, now() - interval '1 minute')
    )
    returning id into v_new_poll_id;

    insert into options (poll_id, label, position)
    select v_new_poll_id, item.label, item.ordinality - 1
    from unnest(v_queue.option_labels) with ordinality as item(label, ordinality);

    update bot_poll_queue
    set published_poll_id = v_new_poll_id,
        published_at = now(),
        last_published_at = now(),
        publication_count = publication_count + 1,
        scheduled_at = null
    where id = v_queue.id;

    insert into bot_activity_log (bot_id, action_type, target_id)
    values (v_queue.bot_id, 'poll', v_new_poll_id);
    v_published := v_published + 1;
  end loop;

  return jsonb_build_object(
    'status', 'completed',
    'window_start', v_window_start,
    'window_end', v_window_end,
    'scheduled_now', v_scheduled,
    'published_now', v_published,
    'scheduled_in_window', (
      select count(*) from bot_poll_queue where schedule_window_start = v_window_start
    )
  );
end;
$$;

revoke all on function schedule_and_publish_bot_polls() from public, anon, authenticated;

-- Engagement remains separate so it cannot change the eight-poll posting quota.
create or replace function run_bot_engagement()
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_last_run timestamptz;
  v_bot_id uuid;
  v_target_id uuid;
  v_option_id uuid;
  v_body text;
  v_votes integer := 0;
  v_likes integer := 0;
  v_comments integer := 0;
  v_follows integer := 0;
  v_result jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('pollhub_bot_engagement')) then
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

  for i in 1..2 loop
    select b.user_id, p.id
    into v_bot_id, v_target_id
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
      where poll_id = v_target_id
      order by random()
      limit 1;

      if v_option_id is not null then
        insert into votes (poll_id, option_id, user_id)
        values (v_target_id, v_option_id, v_bot_id)
        on conflict (poll_id, user_id) do nothing;
        if found then
          insert into bot_activity_log (bot_id, action_type, target_id)
          values (v_bot_id, 'vote', v_target_id);
          v_votes := v_votes + 1;
        end if;
      end if;
    end if;
  end loop;

  select b.user_id, p.id
  into v_bot_id, v_target_id
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
    values (v_target_id, v_bot_id)
    on conflict (poll_id, user_id) do nothing;
    if found then
      insert into bot_activity_log (bot_id, action_type, target_id)
      values (v_bot_id, 'like', v_target_id);
      v_likes := 1;
    end if;
  end if;

  select t.bot_id, p.id, t.body
  into v_bot_id, v_target_id, v_body
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
    values (v_target_id, v_bot_id, v_body);
    insert into bot_activity_log (bot_id, action_type, target_id)
    values (v_bot_id, 'comment', v_target_id);
    v_comments := 1;
  end if;

  select follower.user_id, followed.user_id
  into v_bot_id, v_target_id
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
    values (v_bot_id, v_target_id)
    on conflict (follower_id, following_id) do nothing;
    if found then
      insert into bot_activity_log (bot_id, action_type, target_id)
      values (v_bot_id, 'follow', v_target_id);
      v_follows := 1;
    end if;
  end if;

  v_result := jsonb_build_object(
    'status', 'completed',
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

revoke all on function run_bot_engagement() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'pollhub-bot-activity';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  select jobid into existing_job_id from cron.job where jobname = 'pollhub-bot-posting';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'pollhub-bot-activity',
    '15 */6 * * *',
    'select public.run_bot_engagement()'
  );

  perform cron.schedule(
    'pollhub-bot-posting',
    '*/15 * * * *',
    'select public.schedule_and_publish_bot_polls()'
  );
end;
$$;

select schedule_and_publish_bot_polls();

notify pgrst, 'reload schema';
