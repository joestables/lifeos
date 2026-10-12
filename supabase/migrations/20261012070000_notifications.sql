-- Notifications (plan step 11; REM-001–009, ADR-0044). Each minute a job
-- queues what has come due — Reminders, each person's morning digest, and
-- overdue nudges for those without one — as one row per notification and
-- device, and calls the send-notifications Edge Function when rows wait.
-- The function claims rows, sends them by Web Push and records the result;
-- notification-action does Done and Snooze from a notification's buttons.

-- ---------------------------------------------------------------------------
-- Deliveries carry a token for their buttons (ADR-0044), and can be skipped:
-- the Item was done or deleted, or the device turned off, before sending.

alter table core.reminder_deliveries
  add column token uuid not null default gen_random_uuid(),
  drop constraint reminder_deliveries_status_check,
  add constraint reminder_deliveries_status_check
    check (status in ('waiting', 'sending', 'sent', 'failed', 'gone', 'missed', 'skipped'));

-- ---------------------------------------------------------------------------
-- What a person's day holds, as the digest and Inbox count it (REM-008,
-- INB-003): overdue Tasks (only a due date makes one), Tasks for today or
-- earlier, and Thoughts to sort.

create function core_private.day_counts(p_person uuid, p_today date)
returns table (overdue int, today int, to_sort int)
language sql stable set search_path = '' as $$
  select
    count(*) filter (where i.type = 'task' and i.due_on < p_today)::int,
    count(*) filter (where i.type = 'task' and not coalesce(i.due_on < p_today, false)
                     and (i.do_on <= p_today or i.due_on = p_today))::int,
    count(*) filter (where i.type = 'thought')::int
  from core.items i
  where i.owner_id = p_person and i.archived_at is null
    and (i.type = 'thought' or i.status = 'active')
$$;

-- Whether a Reminder's or nudge's Item still wants it: not deleted, and not
-- done or skipped (REM-004 5).
create function core_private.item_open(p_item uuid)
returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from core.items
    where id = p_item and archived_at is null and status in ('active', 'idea')
  )
$$;

-- ---------------------------------------------------------------------------
-- The minute job's decisions (ADR-0044). One row per notification and
-- device; the unique key on (key, fire_at, device) means a row is never
-- written twice however often this runs. Returns how many rows wait.

create function core_private.queue_notifications(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = '' as $$
declare
  waiting int;
begin
  -- Reminders that have come due in the last 12 hours (REM-004 1, 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at)
  select 'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at
  from core.reminders r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
  where r.fires_at <= p_now and r.fires_at > p_now - interval '12 hours'
    and core_private.item_open(r.item_id)
  on conflict (key, fire_at, device_id) do nothing;

  -- Ones that couldn't be sent within 12 hours are recorded as missed, not
  -- sent (REM-004 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at, status)
  select 'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at, 'missed'
  from core.reminders r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
  where r.fires_at <= p_now - interval '12 hours' and r.fires_at > p_now - interval '36 hours'
    and core_private.item_open(r.item_id)
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

  select count(*)::int into waiting from core.reminder_deliveries
  where status in ('waiting', 'failed') and fire_at <= p_now;
  return waiting;
end
$$;

-- Each minute: queue, and wake the sender only when there is something to
-- send (ADR-0044). The URL and secret are in Vault (environments.md).
create function core_private.notifications_tick()
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if core_private.queue_notifications() > 0 then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/send-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- What a notification says (REM-004 1, REM-005, REM-006, REM-008, REM-009):
-- its title, a line with the Item's time, the link that opens it, and its
-- buttons. Null when there is nothing to send any more.

create function core_private.notification_payload(d core.reminder_deliveries)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  i core.items;
  t core.item_types;
  tz text;
  c record;
  parts text[] := '{}';
  line text;
  buttons jsonb := '[]';
begin
  select timezone into tz from core.people where id = d.person_id;
  if d.kind = 'digest' then
    select * into c from core_private.day_counts(d.person_id, (now() at time zone tz)::date);
    if c.overdue > 0 then parts := parts || (c.overdue || ' overdue'); end if;
    if c.today > 0 then parts := parts || (c.today || ' today'); end if;
    if c.to_sort > 0 then parts := parts || (c.to_sort || ' to sort'); end if;
    if cardinality(parts) = 0 then
      return null;
    end if;
    return jsonb_build_object('title', array_to_string(parts, ' · '), 'body', '', 'url', '/inbox',
                              'tag', d.key, 'actions', '[]'::jsonb);
  end if;

  select * into i from core.items where id = d.item_id;
  if i.id is null or i.archived_at is not null or i.status not in ('active', 'idea') then
    return null;
  end if;
  select * into t from core.item_types where key = i.type;
  if i.do_at is not null and i.do_on is not null then
    line := to_char(i.do_on, 'Dy FMDD Mon') || ' ' || to_char(i.do_at, 'HH24:MI');
  end if;
  if i.due_on is not null then
    line := concat_ws(' · ', line, 'Due ' || to_char(i.due_on, 'Dy FMDD Mon'));
  end if;
  if t.completable then
    buttons := buttons || jsonb_build_object('action', 'done', 'title', 'Done');
  end if;
  buttons := buttons || jsonb_build_object('action', 'snooze', 'title', 'Snooze 1 hour');
  return jsonb_build_object(
    'title', case when d.kind = 'overdue' then 'Overdue: ' else '' end
      || coalesce(nullif(btrim(i.title), ''), t.label),
    'body', coalesce(line, ''),
    'url', '/item/' || i.id,
    'tag', d.key,
    'actions', buttons
  );
end
$$;

-- ---------------------------------------------------------------------------
-- The sender's calls (ADR-0044); only the service role.

-- Whether a call carries the sender's secret, kept only in Vault.
create function core.push_secret_ok(p_secret text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select decrypted_secret = p_secret from vault.decrypted_secrets where name = 'push_secret'),
    false
  )
$$;

-- The VAPID keys, made by the sender the first time it runs and kept in
-- Vault, so the private key is never copied anywhere (integration-setup.md).
create function core.push_keys()
returns table (public_key text, private_key text)
language sql stable security definer set search_path = '' as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key')
$$;

create function core.set_push_keys(p_public text, p_private text)
returns table (public_key text, private_key text)
language plpgsql security definer set search_path = '' as $$
begin
  -- The first keys stay: a second run that raced this one uses them.
  if not exists (select 1 from vault.secrets where name = 'vapid_private_key') then
    perform vault.create_secret(p_private, 'vapid_private_key', 'Web Push VAPID private key');
    perform vault.create_secret(p_public, 'vapid_public_key', 'Web Push VAPID public key');
  end if;
  return query select * from core.push_keys();
end
$$;

-- The app subscribes a device with the public key, which is not a secret.
create function core.vapid_public_key()
returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'
$$;

-- Takes what is due to send, so two runs never take the same row. Rows that
-- no longer apply are skipped, and ones past 12 hours missed, first; a row
-- left "sending" by a run that died is taken again after five minutes.
create function core.claim_deliveries(p_limit int default 100)
returns table (id bigint, endpoint text, p256dh text, auth text, ttl int, payload jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  update core.reminder_deliveries x set status = 'skipped'
  from core.push_devices d
  where d.id = x.device_id and x.status in ('waiting', 'failed') and x.fire_at <= now()
    and (not d.enabled or d.gone_at is not null
         or (x.kind <> 'digest' and not core_private.item_open(x.item_id))
         or (x.kind = 'reminder' and x.reminder_id is null));
  update core.reminder_deliveries x set status = 'missed'
  where x.status in ('waiting', 'failed') and x.fire_at <= now() - interval '12 hours';

  return query
  with taken as (
    select x.id from core.reminder_deliveries x
    where x.fire_at <= now()
      and (x.status in ('waiting', 'failed')
           or (x.status = 'sending' and x.claimed_at < now() - interval '5 minutes'))
    order by x.fire_at
    limit least(greatest(p_limit, 1), 500)
    for update skip locked
  ), claimed as (
    update core.reminder_deliveries x
    set status = 'sending', claimed_at = now(), attempts = x.attempts + 1
    from taken where x.id = taken.id
    returning x.*
  )
  select c.id, d.endpoint, d.p256dh, d.auth,
    greatest(60, extract(epoch from (c.fire_at + interval '12 hours' - now()))::int),
    core_private.notification_payload(c) || jsonb_build_object('delivery', c.id, 'token', c.token)
  from claimed c join core.push_devices d on d.id = c.device_id;
end
$$;

-- Records what each send did (ADR-0044): sent; failed, to be tried again;
-- gone, when the push service says the device no longer exists (it stops
-- being sent to, and ops.events says so, REM-004 4); or skipped, when there
-- was nothing to say. Then the run's heartbeat.
create function core.record_deliveries(p_results jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  dev uuid;
begin
  for r in select * from jsonb_array_elements(p_results) loop
    update core.reminder_deliveries set
      status = r ->> 'outcome',
      sent_at = case when r ->> 'outcome' = 'sent' then now() end,
      error = left(r ->> 'error', 500)
    where id = (r ->> 'id')::bigint
    returning device_id into dev;
    if r ->> 'outcome' = 'sent' then
      update core.push_devices set last_sent_at = now() where id = dev;
    elsif r ->> 'outcome' = 'gone' then
      update core.push_devices set gone_at = now() where id = dev and gone_at is null;
      insert into ops.events (source, kind, message, details, person_id)
      select 'edge', 'push_device_gone', 'A device can no longer receive notifications',
        jsonb_build_object('device', d.id, 'label', d.label, 'error', left(r ->> 'error', 300)), d.person_id
      from core.push_devices d where d.id = dev;
    end if;
  end loop;
  insert into ops.heartbeats (name, at, ok, details)
  values ('send-notifications', now(), true, jsonb_build_object('results', jsonb_array_length(p_results)))
  on conflict (name) do update set at = excluded.at, ok = excluded.ok, details = excluded.details;
end
$$;

-- ---------------------------------------------------------------------------
-- Done and Snooze from a notification (REM-005), checked by the delivery's
-- token rather than a session the service worker doesn't have.

-- What a button acts on; for a Task repeated after completion, its rule, so
-- notification-action can work out the next with the engine (ADR-0045).
create function core.delivery_for_action(p_delivery bigint, p_token uuid)
returns table (item_id uuid, kind text, mode text, rule text, timezone text)
language sql stable security definer set search_path = '' as $$
  select x.item_id, x.kind, s.mode, s.rule, s.timezone
  from core.reminder_deliveries x
  left join core.items i on i.id = x.item_id
  left join core.series s on s.id = i.series_id and s.ended_on is null
  where x.id = p_delivery and x.token = p_token
$$;

create function core.act_on_delivery(p_delivery bigint, p_token uuid, p_action text,
                                     p_next uuid default null, p_next_on date default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  x core.reminder_deliveries;
  i core.items;
  s core.series;
begin
  select * into x from core.reminder_deliveries where id = p_delivery and token = p_token;
  if x.id is null then
    return false;
  end if;
  select * into i from core.items where id = x.item_id;

  if p_action = 'done' then
    if i.id is null or not (select completable from core.item_types where key = i.type) then
      return false;
    end if;
    -- The person did it, so it counts as their change (ADR-0022).
    update core.items set status = 'done' where id = i.id and status <> 'done';
    select * into s from core.series where id = i.series_id;
    if s.mode = 'after_completion' and s.ended_on is null and p_next_on is not null then
      perform core_private.make_occurrences(
        s, jsonb_build_array(jsonb_build_object('id', p_next, 'on', p_next_on)));
      update core.series set generated_until = greatest(generated_until, p_next_on) where id = s.id;
    end if;
    return true;
  elsif p_action = 'snooze' then
    -- An hour from now, however often it's pressed; mine only.
    if x.kind = 'reminder' and x.reminder_id is not null then
      update core.reminders set snoozed_until = now() + interval '1 hour'
      where id = x.reminder_id and person_id = x.person_id;
    else
      insert into core.reminder_deliveries (kind, key, person_id, device_id, item_id, fire_at)
      select x.kind, x.key, x.person_id, d.id, x.item_id, date_trunc('minute', now()) + interval '1 hour'
      from core.push_devices d where d.person_id = x.person_id and d.enabled and d.gone_at is null
      on conflict (key, fire_at, device_id) do nothing;
    end if;
    return true;
  end if;
  return false;
end
$$;

grant execute on function core_private.day_counts(uuid, date) to service_role;
grant execute on function core_private.item_open(uuid) to service_role;
grant execute on function core_private.notification_payload(core.reminder_deliveries) to service_role;
grant execute on function core.push_secret_ok(text) to service_role;
grant execute on function core.push_keys() to service_role;
grant execute on function core.set_push_keys(text, text) to service_role;
grant execute on function core.vapid_public_key() to authenticated;
grant execute on function core.claim_deliveries(int) to service_role;
grant execute on function core.record_deliveries(jsonb) to service_role;
grant execute on function core.delivery_for_action(bigint, uuid) to service_role;
grant execute on function core.act_on_delivery(bigint, uuid, text, uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- A repeating Task's own Reminders go to each occurrence (REM-002 4): the
-- template's relative Reminders, made for the series' owner.

create or replace function core_private.make_occurrences(p_series core.series, p_occurrences jsonb)
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
      insert into core.reminders (item_id, person_id, anchor, offset_days, at_time)
      select v_id, p_series.owner_id, r ->> 'anchor', coalesce((r ->> 'offset_days')::int, 0),
        (r ->> 'at_time')::time
      from jsonb_array_elements(coalesce(t -> 'reminders', '[]')) r
      where r ->> 'anchor' in ('do_on', 'due_on');
    end if;
  end loop;
  perform set_config('lifeos.series_writing', '', true);
end
$$;

-- ---------------------------------------------------------------------------
-- The health check also reports notifications stuck waiting over an hour
-- (runbook.md#notifications): the sender runs only when there is something
-- to send, so a quiet day is not a missing heartbeat.

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

  insert into ops.health_runs (ok, problems)
  values (jsonb_array_length(problems) = 0, problems)
  returning * into run;
  return run;
end
$$;

-- ---------------------------------------------------------------------------
-- Every minute (ADR-0044).

select cron.schedule('minute-notifications', '* * * * *', 'select core_private.notifications_tick()');
