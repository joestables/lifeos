-- Repeating Tasks (plan step 10; TSK-008–011, ADR-0022, ADR-0045). The
-- engine (packages/recurrence) works out the days; these functions write
-- what it decides: on the device when a repeat is set or a Task repeated
-- after completion is done, and each night from the extend-series Edge
-- Function. Nothing here expands a rule.

-- ---------------------------------------------------------------------------
-- Occurrences, each made from its series' template: title, body, do_at,
-- due_offset_days, label_ids. A day already made is left alone, so a replay,
-- or the device and the nightly run making the same day, still leaves one
-- (ADR-0045). The series' own writes touch nothing (ADR-0022).

create function core_private.make_occurrences(p_series core.series, p_occurrences jsonb)
returns void
language plpgsql set search_path = '' as $$
declare
  o jsonb;
  v_id uuid;
  v_on date;
  t jsonb := p_series.template;
begin
  perform set_config('lifeos.series_writing', 'on', true);
  for o in select * from jsonb_array_elements(p_occurrences) loop
    v_on := (o ->> 'on')::date;
    continue when p_series.ended_on is not null and v_on > p_series.ended_on;
    v_id := coalesce((o ->> 'id')::uuid, core_private.uuidv7());
    insert into core.items (id, type, title, body, space_id, owner_id, status, do_on, do_at, due_on,
                            series_id, occurrence_on)
    values (
      v_id,
      p_series.type,
      coalesce(t ->> 'title', ''),
      t ->> 'body',
      p_series.space_id,
      p_series.owner_id,
      'active',
      v_on,
      (t ->> 'do_at')::time,
      v_on + (t ->> 'due_offset_days')::int,
      p_series.id,
      v_on
    )
    on conflict do nothing;
    if found then
      insert into core.item_labels (item_id, label_id)
      select v_id, l.id from core.labels l
      where l.id in (select value::uuid from jsonb_array_elements_text(coalesce(t -> 'label_ids', '[]')))
      on conflict do nothing;
    end if;
  end loop;
  perform set_config('lifeos.series_writing', '', true);
end
$$;

-- A series stops after a day: its untouched, open occurrences after it go
-- (archived, as deleting does), and done, past or touched ones stay
-- (ADR-0022, TSK-011).
create function core_private.end_series(p_series uuid, p_last date, p_keep uuid default null)
returns void
language plpgsql set search_path = '' as $$
begin
  perform set_config('lifeos.series_writing', 'on', true);
  update core.series set ended_on = p_last
  where id = p_series and (ended_on is null or ended_on > p_last);
  update core.items set archived_at = now()
  where series_id = p_series and occurrence_on > p_last and touched_at is null
    and archived_at is null and status in ('active', 'idea') and id is distinct from p_keep;
  perform set_config('lifeos.series_writing', '', true);
end
$$;

-- ---------------------------------------------------------------------------
-- The app's writes (ADR-0042), each replayed safely by the write queue.

-- Makes a Task repeat (TSK-008, TSK-009), or changes its repeat "for this
-- and all following" (TSK-011): the Task becomes the first occurrence of a
-- new series, made with the window the device worked out. A Task already in
-- a series ends that one the day before its own date.
create function core.set_repeat(
  p_item uuid,
  p_series uuid,
  p_mode text,
  p_rule text,
  p_starts_on date,
  p_timezone text,
  p_template jsonb,
  p_occurrences jsonb,
  p_until date
) returns core.items
language plpgsql set search_path = '' as $$
declare
  it core.items;
  s core.series;
  first_on date := (p_occurrences -> 0 ->> 'on')::date;
begin
  select * into it from core.items where id = p_item;
  if it.id is null then
    raise exception 'No Item % to repeat', p_item using errcode = 'P0002';
  end if;
  -- A replay: it was all done in one go.
  if it.series_id = p_series then
    return it;
  end if;
  if first_on is null or (p_occurrences -> 0 ->> 'id')::uuid is distinct from p_item then
    raise exception 'A repeat starts with the Task itself' using errcode = '22023';
  end if;

  insert into core.series (id, type, space_id, mode, rule, starts_on, timezone, template, generated_until)
  values (p_series, it.type, it.space_id, p_mode, p_rule, p_starts_on, p_timezone, p_template, p_until)
  returning * into s;

  if it.series_id is not null then
    perform core_private.end_series(it.series_id, it.occurrence_on - 1, p_item);
  end if;

  perform set_config('lifeos.series_writing', 'on', true);
  update core.items set
    series_id = p_series,
    occurrence_on = first_on,
    do_on = first_on,
    do_at = (p_template ->> 'do_at')::time,
    due_on = first_on + (p_template ->> 'due_offset_days')::int,
    status = case when status = 'idea' then 'active' else status end,
    touched_at = null
  where id = p_item
  returning * into it;
  perform set_config('lifeos.series_writing', '', true);

  perform core_private.make_occurrences(s, p_occurrences - 0);
  return it;
end
$$;

-- Stops a Task repeating (TSK-011): it is the last of its series.
create function core.stop_repeat(p_item uuid)
returns core.items
language plpgsql set search_path = '' as $$
declare
  it core.items;
begin
  select * into it from core.items where id = p_item;
  if it.id is null then
    raise exception 'No Item % to stop', p_item using errcode = 'P0002';
  end if;
  if it.series_id is not null then
    perform core_private.end_series(it.series_id, it.occurrence_on);
  end if;
  return it;
end
$$;

-- Ticks a Task done; one repeated after completion makes its next
-- occurrence on the day the device worked out (TSK-009).
create function core.complete_occurrence(p_id uuid, p_next uuid, p_next_on date)
returns core.items
language plpgsql set search_path = '' as $$
declare
  it core.items;
  s core.series;
begin
  update core.items set status = 'done' where id = p_id returning * into it;
  if it.id is null then
    raise exception 'No Item % to tick', p_id using errcode = 'P0002';
  end if;
  select * into s from core.series where id = it.series_id;
  if s.mode = 'after_completion' and s.ended_on is null then
    perform core_private.make_occurrences(s, jsonb_build_array(jsonb_build_object('id', p_next, 'on', p_next_on)));
    update core.series set generated_until = greatest(generated_until, p_next_on) where id = s.id;
  end if;
  return it;
end
$$;

grant execute on function core_private.make_occurrences(core.series, jsonb) to authenticated, service_role;
grant execute on function core_private.end_series(uuid, date, uuid) to authenticated, service_role;
grant execute on function core.set_repeat(uuid, uuid, text, text, date, text, jsonb, jsonb, date) to authenticated;
grant execute on function core.stop_repeat(uuid) to authenticated;
grant execute on function core.complete_occurrence(uuid, uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- The nightly run (ADR-0045): the extend-series Edge Function reads what to
-- extend, writes each series' days, then finishes. Only the service role.

-- Each series still making occurrences; for one repeated after completion
-- with nothing open, the day (in its timezone) its last one was done.
create function core.series_to_extend()
returns table (
  id uuid,
  mode text,
  rule text,
  starts_on date,
  timezone text,
  generated_until date,
  ended_on date,
  last_done_on date
)
language sql stable set search_path = '' as $$
  select s.id, s.mode, s.rule, s.starts_on, s.timezone, s.generated_until, s.ended_on,
    case when s.mode = 'after_completion' and not exists (
      select 1 from core.items o
      where o.series_id = s.id and o.archived_at is null and o.status in ('active', 'idea')
    ) then (
      select (i.updated_at at time zone s.timezone)::date from core.items i
      where i.series_id = s.id and i.archived_at is null and i.status = 'done'
      order by i.occurrence_on desc limit 1
    ) end
  from core.series s
  where s.ended_on is null or s.ended_on > coalesce(s.generated_until, s.starts_on - 1)
$$;

create function core.extend_series(p_series uuid, p_days date[], p_until date)
returns void
language plpgsql set search_path = '' as $$
declare
  s core.series;
begin
  select * into s from core.series where id = p_series;
  if s.id is null then
    raise exception 'No series %', p_series using errcode = 'P0002';
  end if;
  perform core_private.make_occurrences(
    s,
    (select coalesce(jsonb_agg(jsonb_build_object('on', d)), '[]') from unnest(p_days) d)
  );
  update core.series set generated_until = greatest(coalesce(generated_until, p_until), p_until)
  where id = p_series;
end
$$;

-- Closes untouched occurrences overtaken by a newer one that has come due
-- as skipped (TSK-010), and records the run.
create function core.finish_series_run(p_ok boolean, p_details jsonb default '{}')
returns int
language plpgsql security definer set search_path = '' as $$
declare
  skipped int;
begin
  perform set_config('lifeos.series_writing', 'on', true);
  update core.items i set status = 'cancelled'
  from core.series s
  where i.series_id = s.id and i.touched_at is null and i.archived_at is null
    and i.status in ('active', 'idea')
    and exists (
      select 1 from core.items n
      where n.series_id = i.series_id and n.archived_at is null
        and n.occurrence_on > i.occurrence_on
        and n.do_on <= (now() at time zone s.timezone)::date
    );
  get diagnostics skipped = row_count;
  perform set_config('lifeos.series_writing', '', true);

  insert into ops.heartbeats (name, at, ok, details)
  values ('extend-series', now(), p_ok, p_details || jsonb_build_object('skipped', skipped))
  on conflict (name) do update set at = excluded.at, ok = excluded.ok, details = excluded.details;
  if not p_ok then
    insert into ops.events (source, kind, message, details)
    values ('edge', 'series_failed', 'The nightly series run failed', p_details);
  end if;
  return skipped;
end
$$;

grant execute on function core.series_to_extend() to service_role;
grant execute on function core.extend_series(uuid, date[], date) to service_role;
grant execute on function core.finish_series_run(boolean, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- The health check also looks for the series run's heartbeat
-- (runbook.md#noticing-problems).

create or replace function ops.health_check() returns ops.health_runs
language plpgsql security definer set search_path = '' as $$
declare
  problems jsonb := '[]';
  counts jsonb;
  failed jsonb;
  beat ops.heartbeats;
  run ops.health_runs;
begin
  select jsonb_object_agg(source || ' ' || kind, n) into counts
  from (
    select source, kind, count(*) as n from ops.events
    where at > now() - interval '1 day' and source <> 'health'
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

  insert into ops.health_runs (ok, problems)
  values (jsonb_array_length(problems) = 0, problems)
  returning * into run;
  return run;
end
$$;

-- ---------------------------------------------------------------------------
-- Each night at 02:00 UTC, before the 03:00 health check, pg_net calls the
-- Edge Function with the project's URL and a shared secret, both kept in
-- Vault (environments.md#secrets).

create extension if not exists pg_net;
select cron.schedule('nightly-series', '0 2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/extend-series',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'series_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
$$);
