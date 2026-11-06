-- Stage 7, step 8a (ADR-0063, REM-010): the Android app sets its own
-- Reminders. It proves itself with a device secret; reads its Reminders for
-- the next week; is told by an FCM "look again" when they change; and Done
-- and Snooze from it act as the person. Reminders for such a device are
-- recorded as on_device and never sent. A device only gets what comes due
-- after it was turned on (a new device was being sent the last 12 hours').

alter table core.push_devices
  -- The Android app's secret, as a SHA-256 hash; the app keeps the secret.
  add column secret_hash text,
  -- Its Reminders changed since it last looked: the next run tells it.
  add column look_wanted_at timestamptz;

alter table core.reminder_deliveries drop constraint reminder_deliveries_status_check;
alter table core.reminder_deliveries add constraint reminder_deliveries_status_check
  check (status in ('waiting', 'sending', 'sent', 'failed', 'gone', 'missed', 'skipped', 'on_device'));

-- A new secret for my Android app device, shown once (ADR-0063).
create function core.device_secret(p_device uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  secret text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  update core.push_devices set secret_hash = encode(sha256(convert_to(secret, 'UTF8')), 'hex')
  where id = p_device and person_id = me and kind = 'fcm';
  if not found then
    raise exception 'Not my Android app' using errcode = '42501';
  end if;
  return secret;
end
$$;
grant execute on function core.device_secret(uuid) to authenticated;

-- The person an Android app device acts for, when its secret is right.
create function core_private.device_person(p_device uuid, p_secret text)
returns uuid
language sql stable security definer set search_path = '' as $$
  select person_id from core.push_devices
  where id = p_device and kind = 'fcm' and enabled and gone_at is null
    and secret_hash is not null
    and secret_hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex')
$$;
revoke execute on function core_private.device_person(uuid, text) from public, anon, authenticated;

-- The device's person's Reminders from 12 hours ago to a week ahead, each
-- with what its notification says, for the phone to set (REM-010).
create function core.device_reminders(p_device uuid, p_secret text)
returns table (reminder_id uuid, fires_at timestamptz, payload jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := core_private.device_person(p_device, p_secret);
begin
  if me is null then
    raise exception 'Not a device' using errcode = '42501';
  end if;
  return query
  select f.id, f.fires_at, core_private.notification_payload(
      jsonb_populate_record(null::core.reminder_deliveries, jsonb_build_object(
        'kind', 'reminder', 'key', 'reminder:' || f.id, 'person_id', me,
        'item_id', f.item_id, 'reminder_id', f.id, 'fire_at', f.fires_at)))
  from (
    select distinct on (r.item_id, r.fires_at) r.id, r.item_id, r.fires_at
    from core.reminders r
    where r.person_id = me
      and r.fires_at > now() - interval '12 hours' and r.fires_at <= now() + interval '7 days'
      and r.fires_at >= r.updated_at - interval '1 minute'
      and core_private.item_open(r.item_id)
      and core_private.readable_by(me, r.item_id)
    order by r.item_id, r.fires_at, r.id
  ) f
  order by f.fires_at
  limit 400;
end
$$;
grant execute on function core.device_reminders(uuid, text) to service_role;

-- When a person's Reminders change, their Android app devices look again.
create function core_private.want_look()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices set look_wanted_at = now()
  where kind = 'fcm' and secret_hash is not null and enabled and gone_at is null
    and person_id in (
      select person_id from new_rows union select person_id from old_rows
    )
    and look_wanted_at is null;
  return null;
end
$$;
create function core_private.want_look_inserted()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices set look_wanted_at = now()
  where kind = 'fcm' and secret_hash is not null and enabled and gone_at is null
    and person_id in (select person_id from new_rows) and look_wanted_at is null;
  return null;
end
$$;
create function core_private.want_look_deleted()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices set look_wanted_at = now()
  where kind = 'fcm' and secret_hash is not null and enabled and gone_at is null
    and person_id in (select person_id from old_rows) and look_wanted_at is null;
  return null;
end
$$;
create trigger reminders_look_updated after update on core.reminders
  referencing new table as new_rows old table as old_rows
  for each statement execute function core_private.want_look();
create trigger reminders_look_inserted after insert on core.reminders
  referencing new table as new_rows
  for each statement execute function core_private.want_look_inserted();
create trigger reminders_look_deleted after delete on core.reminders
  referencing old table as old_rows
  for each statement execute function core_private.want_look_deleted();

-- Done, archived or brought back changes which Reminders fire, without
-- touching them: their people look again too.
create function core_private.want_look_items()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices set look_wanted_at = now()
  where kind = 'fcm' and secret_hash is not null and enabled and gone_at is null
    and look_wanted_at is null
    and person_id in (
      select r.person_id from core.reminders r
      join new_rows n on n.id = r.item_id
      join old_rows o on o.id = n.id
      where n.status is distinct from o.status or n.archived_at is distinct from o.archived_at
    );
  return null;
end
$$;
create trigger items_look after update on core.items
  referencing new table as new_rows old table as old_rows
  for each statement execute function core_private.want_look_items();
revoke execute on function core_private.want_look(), core_private.want_look_inserted(),
  core_private.want_look_deleted(), core_private.want_look_items() from public, anon, authenticated;

-- The Android app devices to tell to look again, taken once.
create function core.claim_looks()
returns table (device_id uuid, endpoint text)
language sql security definer set search_path = '' as $$
  update core.push_devices set look_wanted_at = null
  where look_wanted_at is not null and kind = 'fcm' and enabled and gone_at is null
  returning id, endpoint
$$;
grant execute on function core.claim_looks() to service_role;

create or replace function core_private.queue_notifications(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = '' as $$
declare
  waiting int;
begin
  -- Reminders that have come due in the last 12 hours (REM-004 1, 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at, status)
  select distinct on (r.item_id, d.id, r.fires_at)
    'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at,
    -- The Android app sets its own (ADR-0063): recorded, never sent.
    case when d.kind = 'fcm' and d.secret_hash is not null then 'on_device' else 'waiting' end
  from core.reminders r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
    -- Only what comes due after the device was turned on, not what it missed before.
    and d.created_at <= r.fires_at
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
    and d.created_at <= r.fires_at
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
    and d.created_at <= local.at
  where p.digest_on and local.at <= p_now and local.at > p_now - interval '12 hours'
  on conflict (key, fire_at, device_id) do nothing;

  -- Without a digest, each overdue Task in my Spaces is nudged once to me,
  -- at my default time (REM-009; a shared Task to each member, HSH-005 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, item_id, fire_at)
  select 'overdue', 'overdue:' || i.id || ':' || i.due_on, p.id, d.id, i.id, local.at
  from core.people p
  cross join lateral (
    select (p_now at time zone p.timezone)::date as day,
      ((p_now at time zone p.timezone)::date + p.default_reminder_time) at time zone p.timezone as at
  ) local
  join core.space_members m on m.person_id = p.id
  join core.items i on i.space_id = m.space_id and i.type = 'task' and i.status = 'active'
    and i.archived_at is null and i.due_on < local.day
  join core.push_devices d on d.person_id = p.id and d.enabled and d.gone_at is null
    and d.created_at <= local.at
  where not p.digest_on and local.at <= p_now and local.at > p_now - interval '12 hours'
    and not exists (
      select 1 from core.reminder_deliveries x
      where x.key = 'overdue:' || i.id || ':' || i.due_on and x.person_id = p.id
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

-- The minute run wakes send-notifications for a look as well as a delivery.
create or replace function core_private.notifications_tick()
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if core_private.queue_notifications() > 0
     or exists (select 1 from core.push_devices where look_wanted_at is not null) then
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

-- What Done and Snooze do, for a delivery or a Reminder set on the phone:
-- as act_on_delivery did (ADR-0044), now shared.
create function core_private.act_on(
  x core.reminder_deliveries, p_action text, p_next uuid, p_next_on date)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  i core.items;
  s core.series;
begin
  select * into i from core.items where id = x.item_id;

  if p_action = 'done' then
    if i.id is null or not (select completable from core.item_types where key = i.type) then
      return false;
    end if;
    -- Only by someone who may still change it: not after leaving its Household.
    if not exists (
      select 1 from core.space_members m where m.person_id = x.person_id and m.space_id = i.space_id
    ) then
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
revoke execute on function core_private.act_on(core.reminder_deliveries, text, uuid, date) from public, anon, authenticated;

create or replace function core.act_on_delivery(
  p_delivery bigint, p_token uuid, p_action text, p_next uuid default null, p_next_on date default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  x core.reminder_deliveries;
begin
  select * into x from core.reminder_deliveries where id = p_delivery and token = p_token;
  if x.id is null then
    return false;
  end if;
  return core_private.act_on(x, p_action, p_next, p_next_on);
end
$$;

-- Done and Snooze on a Reminder the phone set (REM-005, REM-010), proved by
-- the device's secret; the Reminder must be its person's.
create function core.reminder_for_action(p_device uuid, p_secret text, p_reminder uuid)
returns table (item_id uuid, kind text, mode text, rule text, timezone text)
language sql stable security definer set search_path = '' as $$
  select r.item_id, 'reminder'::text, s.mode, s.rule, s.timezone
  from core.reminders r
  left join core.items i on i.id = r.item_id
  left join core.series s on s.id = i.series_id and s.ended_on is null
  where r.id = p_reminder and r.person_id = core_private.device_person(p_device, p_secret)
$$;
grant execute on function core.reminder_for_action(uuid, text, uuid) to service_role;

create function core.act_on_reminder(
  p_device uuid, p_secret text, p_reminder uuid, p_action text,
  p_next uuid default null, p_next_on date default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := core_private.device_person(p_device, p_secret);
  r core.reminders;
begin
  select * into r from core.reminders where id = p_reminder and person_id = me;
  if me is null or r.id is null then
    return false;
  end if;
  return core_private.act_on(
    jsonb_populate_record(null::core.reminder_deliveries, jsonb_build_object(
      'kind', 'reminder', 'key', 'reminder:' || r.id, 'person_id', me,
      'item_id', r.item_id, 'reminder_id', r.id, 'device_id', p_device)),
    p_action, p_next, p_next_on);
end
$$;
grant execute on function core.act_on_reminder(uuid, text, uuid, text, uuid, date) to service_role;
