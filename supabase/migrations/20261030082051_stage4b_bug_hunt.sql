-- The production bug hunt of 29 October 2026.

-- ---------------------------------------------------------------------------
-- One notification for one moment (REM-004 2): two of my Reminders on one
-- Item firing at the same moment (its default and one I set at its time,
-- as "Put the bins out" had at 20:00 on 27 October) reach each device once.
-- The oldest goes; any other at that moment is left out, also when one
-- already queued is later snoozed. The rest is as step14_fixes left it.

create or replace function core_private.queue_notifications(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = '' as $$
declare
  waiting int;
begin
  -- Reminders that have come due in the last 12 hours (REM-004 1, 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at)
  select distinct on (r.item_id, d.id, r.fires_at)
    'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at
  from core.reminders r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
  where r.fires_at <= p_now and r.fires_at > p_now - interval '12 hours'
    -- Not one already past when it was set (a Task captured at 15:00 for
    -- today has its 09:00 default behind it).
    and r.fires_at >= r.updated_at - interval '1 minute'
    and core_private.item_open(r.item_id)
    and not exists (
      select 1 from core.reminder_deliveries x
      where x.kind = 'reminder' and x.item_id = r.item_id and x.device_id = d.id
        and x.fire_at = r.fires_at and x.key <> 'reminder:' || r.id
    )
  order by r.item_id, d.id, r.fires_at, r.id
  on conflict (key, fire_at, device_id) do nothing;

  -- Ones that couldn't be sent within 12 hours are recorded as missed, not
  -- sent (REM-004 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at, status)
  select distinct on (r.item_id, d.id, r.fires_at)
    'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at, 'missed'
  from core.reminders r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
  where r.fires_at <= p_now - interval '12 hours' and r.fires_at > p_now - interval '36 hours'
    and r.fires_at >= r.updated_at - interval '1 minute'
    and core_private.item_open(r.item_id)
    and not exists (
      select 1 from core.reminder_deliveries x
      where x.kind = 'reminder' and x.item_id = r.item_id and x.device_id = d.id
        and x.fire_at = r.fires_at and x.key <> 'reminder:' || r.id
    )
  order by r.item_id, d.id, r.fires_at, r.id
  on conflict (key, fire_at, device_id) do nothing;

  -- The morning digest at each person's digest time, in their timezone
  -- (REM-008). With nothing to say it is recorded as skipped, so it doesn't
  -- arrive later in the day.
  insert into core.reminder_deliveries (kind, key, person_id, device_id, fire_at, status)
  select 'digest', 'digest:' || p.id || ':' || local.day, p.id, d.id, local.at,
    case when c.overdue + c.today + c.to_sort = 0 then 'skipped' else 'waiting' end
  from core.people p
  cross join lateral (
    select (p_now at time zone p.timezone)::date as day,
      ((p_now at time zone p.timezone)::date + p.digest_time) at time zone p.timezone as at
  ) local
  cross join lateral core_private.day_counts(p.id, local.day) c
  join core.push_devices d on d.person_id = p.id and d.enabled and d.gone_at is null
  where p.digest_on and local.at <= p_now and local.at > p_now - interval '12 hours'
  on conflict (key, fire_at, device_id) do nothing;

  -- Without a digest, each overdue Task is nudged once, at the person's
  -- default time (REM-009).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, item_id, fire_at)
  select 'overdue', 'overdue:' || i.id || ':' || i.due_on, p.id, d.id, i.id, local.at
  from core.people p
  cross join lateral (
    select (p_now at time zone p.timezone)::date as day,
      ((p_now at time zone p.timezone)::date + p.default_reminder_time) at time zone p.timezone as at
  ) local
  join core.items i on i.owner_id = p.id and i.type = 'task' and i.status = 'active'
    and i.archived_at is null and i.due_on < local.day
  join core.push_devices d on d.person_id = p.id and d.enabled and d.gone_at is null
  where not p.digest_on and local.at <= p_now and local.at > p_now - interval '12 hours'
    and not exists (
      select 1 from core.reminder_deliveries x where x.key = 'overdue:' || i.id || ':' || i.due_on
    )
  on conflict (key, fire_at, device_id) do nothing;

  -- A sender that stopped mid-way leaves rows claimed: they count too.
  select count(*)::int into waiting from core.reminder_deliveries
  where (status in ('waiting', 'failed')
      or (status = 'sending' and claimed_at < p_now - interval '5 minutes'))
    and fire_at <= p_now;
  return waiting;
end
$$;

-- ---------------------------------------------------------------------------
-- The nightly health check counts problems, not uses: each use of the AI is
-- an `ai` row in ops.events, the allowance's count (ADR-0054), and isn't one.
-- Since Stage 4 a recipe imported in the day made the night's run fail. The
-- rest is as stage3_calendar_health left it.

create or replace function ops.health_check() returns ops.health_runs
language plpgsql security definer set search_path = '' as $$
declare
  problems jsonb := '[]';
  counts jsonb;
  failed jsonb;
  stuck int;
  beat ops.heartbeats;
  run ops.health_runs;
begin
  select jsonb_object_agg(source || ' ' || kind, n) into counts
  from (
    select source, kind, count(*) as n from ops.events
    where at > now() - interval '1 day' and source <> 'health'
      and not (source = 'edge' and kind = 'ai')
    group by source, kind
  ) e;
  if counts is not null then
    problems := problems || jsonb_build_object('check', 'events', 'found', counts);
  end if;

  select jsonb_agg(jsonb_build_object('job', j.jobname, 'at', d.start_time, 'message', left(d.return_message, 200)))
  into failed
  from cron.job_run_details d join cron.job j using (jobid)
  where d.status = 'failed' and d.start_time > now() - interval '1 day';
  if failed is not null then
    problems := problems || jsonb_build_object('check', 'jobs', 'found', failed);
  end if;

  -- The backup, once it reports; the series run, once there is a series.
  for beat in select * from ops.heartbeats where name in ('backup', 'extend-series') loop
    if not beat.ok or beat.at < now() - interval '26 hours' then
      problems := problems || jsonb_build_object('check', beat.name, 'found', to_jsonb(beat));
    end if;
  end loop;
  if not exists (select 1 from ops.heartbeats where name = 'extend-series')
    and exists (select 1 from core.series where created_at < now() - interval '26 hours')
  then
    problems := problems || jsonb_build_object('check', 'extend-series', 'found', 'never ran');
  end if;

  select count(*)::int into stuck from core.reminder_deliveries
  where status in ('waiting', 'failed', 'sending') and fire_at < now() - interval '1 hour';
  if stuck > 0 then
    problems := problems || jsonb_build_object('check', 'notifications', 'found', stuck || ' waiting over an hour');
  end if;

  select count(*)::int into stuck from core.connections
  where state = 'broken' and disconnected_at is null;
  if stuck > 0 then
    problems := problems || jsonb_build_object('check', 'calendar', 'found', stuck || ' not syncing');
  end if;

  insert into ops.health_runs (ok, problems)
  values (jsonb_array_length(problems) = 0, problems)
  returning * into run;
  return run;
end
$$;
