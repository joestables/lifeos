-- Fixes from Joe's first use and a bug hunt (plan step 14).
--
-- 1. A conversion can be undone (ITM-004): back to the Type the Item's latest
--    conversion came from, which the ontology may not allow as a conversion
--    of its own (a Task can't become a Thought).
-- 2. A Type's default Reminder is made when the Item gains its date, not
--    each time the date moves: one I removed doesn't come back, and one I
--    changed isn't joined by a second (REM-002).
-- 3. A Reminder already past when it was set isn't sent (REM-004).
-- 4. A Label made on a device that didn't know the name was taken is the
--    same Label: its id is kept as another name for it, so the Item gets it
--    (ITM-005).
-- 5. The nightly run doesn't bring back an after-completion repeat whose
--    open occurrence I deleted (TSK-009).
-- 6. Notifications claimed by a sender that stopped wake the sender again.

create or replace function core_private.check_item() returns trigger
language plpgsql set search_path = '' as $$
declare
  t core.item_types;
  space_kind text;
  field text;
begin
  select * into t from core.item_types where key = new.type;
  if tg_op = 'UPDATE' and new.type <> old.type and not exists (
    select 1 from core.item_types o where o.key = old.type and new.type = any (o.converts_to)
  ) and not exists (
    -- Undo: back to the Type its latest conversion came from (ITM-004).
    select 1 from (
      select a.changed -> 'type' as type from core.activity a
      where a.item_id = new.id and a.verb = 'converted'
      order by a.id desc limit 1
    ) last
    where last.type ->> 'from' = new.type and last.type ->> 'to' = old.type
  ) then
    raise exception 'A % can''t be converted into a %', old.type, t.label using errcode = '23514';
  end if;
  if not new.status = any (t.statuses) then
    raise exception 'A % can''t have the status %', t.label, new.status using errcode = '23514';
  end if;
  foreach field in array array['starts_at', 'ends_at', 'all_day', 'due_on', 'do_on', 'do_at', 'slot'] loop
    if not field = any (t.time_fields) and to_jsonb(new) -> field <> 'null'::jsonb then
      raise exception 'A % has no %', t.label, field using errcode = '23514';
    end if;
  end loop;
  select kind into space_kind from core.spaces where id = new.space_id;
  if space_kind = 'household' and not t.shareable then
    raise exception 'A % is always Personal', t.label using errcode = '23514';
  end if;
  return new;
end
$$;

create or replace function core_private.sync_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
  anchor_day date;
begin
  select * into t from core.item_types where key = new.type;

  if tg_op = 'UPDATE' and (new.type <> old.type) then
    -- Converted: Labels and marks go if the new Type has none (ITM-004).
    if not t.uses_labels then
      delete from core.item_labels where item_id = new.id;
    end if;
    if t.mark is null then
      delete from core.marks where item_id = new.id;
    end if;
  end if;

  anchor_day := case t.default_reminder
    when 'do_on' then new.do_on
    when 'due_on' then new.due_on
    when 'starts_at' then new.starts_at::date
  end;
  if t.default_reminder is null or anchor_day is null then
    delete from core.reminders where item_id = new.id and is_default;
  elsif not exists (select 1 from core.reminders where item_id = new.id and person_id = new.owner_id and is_default)
    and coalesce((select (p.reminder_defaults ->> new.type)::boolean from core.people p where p.id = new.owner_id), true)
    -- Only when it gains the date (or becomes a Type with a default): a
    -- default I removed or changed doesn't come back when the date moves.
    and (tg_op = 'INSERT' or old.type <> new.type or case t.default_reminder
      when 'do_on' then old.do_on
      when 'due_on' then old.due_on
      when 'starts_at' then old.starts_at::date
    end is null)
  then
    insert into core.reminders (item_id, person_id, anchor, is_default)
    values (new.id, new.owner_id, t.default_reminder, true);
  end if;

  if tg_op = 'UPDATE'
    and (old.do_on, old.do_at, old.due_on, old.starts_at) is distinct from (new.do_on, new.do_at, new.due_on, new.starts_at)
  then
    update core.reminders set snoozed_until = null where item_id = new.id;
  end if;
  return null;
end
$$;

-- ---------------------------------------------------------------------------
-- Labels known by another id.

alter table core.labels add column aliases uuid[] not null default '{}';

create or replace function core.create_label(p_id uuid, p_name text, p_space_id uuid default null)
returns core.labels
language plpgsql set search_path = '' as $$
declare
  space uuid := coalesce(p_space_id, core_private.default_space('note'));
  r core.labels;
begin
  insert into core.labels (id, space_id, name)
  values (p_id, space, btrim(p_name))
  on conflict do nothing;
  select * into r from core.labels
  where id = p_id or p_id = any (aliases)
    or (space_id = space and lower(btrim(name)) = lower(btrim(p_name)))
  order by id = p_id desc
  limit 1;
  -- The device goes on using its own id for it.
  if r.id <> p_id and not p_id = any (r.aliases) then
    update core.labels set aliases = aliases || p_id where id = r.id returning * into r;
  end if;
  return r;
end
$$;

create or replace function core.add_label(p_item uuid, p_label uuid)
returns void
language sql set search_path = '' as $$
  insert into core.item_labels (item_id, label_id)
  values (p_item, coalesce(
    (select l.id from core.labels l where p_label = any (l.aliases) limit 1),
    p_label
  ))
  on conflict do nothing
$$;

create or replace function core.remove_label(p_item uuid, p_label uuid)
returns void
language sql set search_path = '' as $$
  delete from core.item_labels
  where item_id = p_item
    and label_id in (select l.id from core.labels l where l.id = p_label or p_label = any (l.aliases))
$$;

create or replace function core.rename_label(p_id uuid, p_name text)
returns core.labels
language plpgsql set search_path = '' as $$
declare
  r core.labels;
begin
  update core.labels set name = btrim(p_name) where id = p_id or p_id = any (aliases)
  returning * into r;
  if r.id is null then
    raise exception 'No Label % to rename', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create or replace function core.delete_label(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from core.labels where id = p_id or p_id = any (aliases)
$$;

-- ---------------------------------------------------------------------------

create or replace function core.series_to_extend()
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
    -- The next comes after the latest was done: not after it was deleted.
    case when s.mode = 'after_completion' and not exists (
      select 1 from core.items o
      where o.series_id = s.id and o.archived_at is null and o.status in ('active', 'idea')
    ) then (
      select case when i.archived_at is null and i.status = 'done'
        then (i.updated_at at time zone s.timezone)::date end
      from core.items i
      where i.series_id = s.id
      order by i.occurrence_on desc, i.created_at desc limit 1
    ) end
  from core.series s
  where s.ended_on is null or s.ended_on > coalesce(s.generated_until, s.starts_on - 1)
$$;

create or replace function core_private.queue_notifications(p_now timestamptz default now())
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
    -- Not one already past when it was set (a Task captured at 15:00 for
    -- today has its 09:00 default behind it).
    and r.fires_at >= r.updated_at - interval '1 minute'
    and core_private.item_open(r.item_id)
  on conflict (key, fire_at, device_id) do nothing;

  -- Ones that couldn't be sent within 12 hours are recorded as missed, not
  -- sent (REM-004 3).
  insert into core.reminder_deliveries (kind, key, person_id, device_id, reminder_id, item_id, fire_at, status)
  select 'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at, 'missed'
  from core.reminders r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
  where r.fires_at <= p_now - interval '12 hours' and r.fires_at > p_now - interval '36 hours'
    and r.fires_at >= r.updated_at - interval '1 minute'
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

  -- A sender that stopped mid-way leaves rows claimed: they count too.
  select count(*)::int into waiting from core.reminder_deliveries
  where (status in ('waiting', 'failed')
      or (status = 'sending' and claimed_at < p_now - interval '5 minutes'))
    and fire_at <= p_now;
  return waiting;
end
$$;
