-- Stage 3 (plan step 9): the nightly health check counts broken Google
-- Calendar connections (GCL-006 1). The rest is as the notifications
-- migration left it.

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
