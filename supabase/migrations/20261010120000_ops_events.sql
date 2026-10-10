-- Noticing problems (Stage 1, step 12; runbook.md#noticing-problems,
-- ADR-0035): one errors table, written by the app and by jobs, and a
-- nightly health check. The ops schema is not exposed to the API.

create schema ops;
grant usage on schema ops to authenticated, service_role;
alter default privileges in schema ops revoke execute on functions from public;

create table ops.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null check (source in ('app', 'edge', 'cron', 'integration', 'health')),
  kind text not null check (length(kind) <= 40),
  message text not null check (length(message) <= 2000),
  -- Where it happened and the last few actions; never the content of Items.
  screen text check (length(screen) <= 200),
  actions jsonb not null default '[]' check (jsonb_typeof(actions) = 'array' and pg_column_size(actions) <= 4000),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 4000),
  person_id uuid default auth.uid() references core.people (id) on delete set null,
  app_version text check (length(app_version) <= 40)
);
create index events_at on ops.events (at);

-- People can add their own app events and read none; Claude reads them
-- through the Supabase MCP.
alter table ops.events enable row level security;
grant insert (source, kind, message, screen, actions, details, app_version) on ops.events to authenticated;
create policy "I report my own app events" on ops.events
  for insert to authenticated
  with check (source = 'app' and person_id = (select auth.uid()));

-- The app's one way in (ADR-0042: every write is a database function).
-- Long values are cut, not refused: a report must never fail.
create function core.report_event(
  p_kind text,
  p_message text,
  p_screen text default null,
  p_actions jsonb default '[]',
  p_details jsonb default '{}',
  p_app_version text default null
) returns void
language sql set search_path = '' as $$
  insert into ops.events (source, kind, message, screen, actions, details, app_version)
  values (
    'app',
    left(p_kind, 40),
    left(p_message, 2000),
    left(p_screen, 200),
    case when jsonb_typeof(p_actions) = 'array' and pg_column_size(p_actions) <= 4000 then p_actions else '[]' end,
    case when jsonb_typeof(p_details) = 'object' and pg_column_size(p_details) <= 4000 then p_details else '{}' end,
    left(p_app_version, 40)
  )
$$;
grant execute on function core.report_event(text, text, text, jsonb, jsonb, text) to authenticated;

-- Jobs outside the database (the nightly backup) say when they last ran.
create table ops.heartbeats (
  name text primary key,
  at timestamptz not null default now(),
  ok boolean not null,
  details jsonb not null default '{}'
);
alter table ops.heartbeats enable row level security;

-- The nightly health check's findings, newest last.
create table ops.health_runs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  ok boolean not null,
  problems jsonb not null default '[]'
);
alter table ops.health_runs enable row level security;

-- Looks at the last day: events, failed jobs, the backup, and records what
-- it finds.
create function ops.health_check() returns ops.health_runs
language plpgsql security definer set search_path = '' as $$
declare
  problems jsonb := '[]';
  counts jsonb;
  failed jsonb;
  backup ops.heartbeats;
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

  select * into backup from ops.heartbeats where name = 'backup';
  if backup.name is not null and (not backup.ok or backup.at < now() - interval '26 hours') then
    problems := problems || jsonb_build_object('check', 'backup', 'found', to_jsonb(backup));
  end if;

  insert into ops.health_runs (ok, problems)
  values (jsonb_array_length(problems) = 0, problems)
  returning * into run;
  return run;
end
$$;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('nightly-health-check', '0 3 * * *', 'select ops.health_check()');
