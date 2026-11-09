-- Stage 7b, step 4: Alerts by name (ADR-0065 4). What an Item's
-- notifications were called, Reminders, are its Alerts; `reminder` is now
-- only the Type to come (step 5). The tables, their columns, constraints,
-- indexes, triggers and policies, and the functions follow. Nothing behaves
-- differently.
--
-- Until step 10 the old names keep working for what may still call them:
-- a write queued on a device before this (the old function names, as
-- wrappers), the app still open in a browser (`core.reminders` as a view),
-- and the Android app as installed (the Edge Functions' fields, and the
-- notifications' `kind` and `key`, 'reminder', which stay as they are).

-- The tables and their columns.
alter table core.reminders rename to alerts;
alter table core.reminder_deliveries rename to alert_deliveries;
alter table core.alert_deliveries rename column reminder_id to alert_id;
alter sequence core.reminder_deliveries_id_seq rename to alert_deliveries_id_seq;
alter table core.item_types rename column default_reminder to default_alert;
alter table core.people rename column default_reminder_time to default_alert_time;
alter table core.people rename column reminder_defaults to alert_defaults;

alter table core.alerts rename constraint reminders_anchor_check to alerts_anchor_check;
alter table core.alerts rename constraint reminders_check to alerts_check;
alter table core.alerts rename constraint reminders_check1 to alerts_check1;
alter table core.alerts rename constraint reminders_item_id_fkey to alerts_item_id_fkey;
alter table core.alerts rename constraint reminders_offset_days_check to alerts_offset_days_check;
alter table core.alerts rename constraint reminders_offset_minutes_check to alerts_offset_minutes_check;
alter table core.alerts rename constraint reminders_person_id_fkey to alerts_person_id_fkey;
alter table core.alerts rename constraint reminders_pkey to alerts_pkey;
alter table core.alert_deliveries rename constraint reminder_deliveries_device_id_fkey to alert_deliveries_device_id_fkey;
alter table core.alert_deliveries rename constraint reminder_deliveries_error_check to alert_deliveries_error_check;
alter table core.alert_deliveries rename constraint reminder_deliveries_item_id_fkey to alert_deliveries_item_id_fkey;
alter table core.alert_deliveries rename constraint reminder_deliveries_key_check to alert_deliveries_key_check;
alter table core.alert_deliveries rename constraint reminder_deliveries_key_fire_at_device_id_key to alert_deliveries_key_fire_at_device_id_key;
alter table core.alert_deliveries rename constraint reminder_deliveries_kind_check to alert_deliveries_kind_check;
alter table core.alert_deliveries rename constraint reminder_deliveries_person_id_fkey to alert_deliveries_person_id_fkey;
alter table core.alert_deliveries rename constraint reminder_deliveries_pkey to alert_deliveries_pkey;
alter table core.alert_deliveries rename constraint reminder_deliveries_status_check to alert_deliveries_status_check;
alter table core.alert_deliveries rename constraint reminder_deliveries_reminder_id_fkey to alert_deliveries_alert_id_fkey;
alter index core.reminders_item rename to alerts_item;
alter index core.reminders_person rename to alerts_person;
alter index core.reminders_fires_at rename to alerts_fires_at;
alter index core.reminders_one_default rename to alerts_one_default;
alter index core.reminder_deliveries_waiting rename to alert_deliveries_waiting;
alter index core.reminder_deliveries_person rename to alert_deliveries_person;
alter index core.reminder_deliveries_device rename to alert_deliveries_device;
alter index core.reminder_deliveries_reminder rename to alert_deliveries_alert;
alter index core.reminder_deliveries_item rename to alert_deliveries_item;

alter policy "I read my Reminders" on core.alerts rename to "I read my Alerts";
alter policy "I change my Reminders" on core.alerts rename to "I change my Alerts";
alter policy "I remove my Reminders" on core.alerts rename to "I remove my Alerts";
alter policy "I set Reminders on what I can see" on core.alerts rename to "I set Alerts on what I can see";

-- The functions, under the new names where theirs said Reminder.
create or replace function core_private.check_alert_fields(p_fields jsonb) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if exists (select 1 from jsonb_object_keys(p_fields) k
             where k not in ('anchor', 'offset_days', 'at_time', 'offset_minutes', 'fixed_at', 'alarm')) then
    raise exception 'Unknown field in %', p_fields using errcode = '22023';
  end if;
end
$$;

create or replace function core_private.alert_fires_at(r core.alerts) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
declare
  item core.items;
  tz text;
  day date;
begin
  if r.snoozed_until is not null then
    return r.snoozed_until;
  end if;
  if r.anchor is null then
    return r.fixed_at;
  end if;
  select * into item from core.items where id = r.item_id;
  select coalesce(p.timezone, 'Europe/London') into tz from core.people p where p.id = r.person_id;
  tz := coalesce(tz, 'Europe/London');
  if r.anchor = 'starts_at' then
    if item.starts_at is null then
      return null;
    end if;
    if r.at_time is null and item.all_day is not true then
      return item.starts_at + make_interval(mins => r.offset_minutes);
    end if;
    day := case when item.all_day then (item.starts_at at time zone 'UTC')::date
                else (item.starts_at at time zone tz)::date end;
    return ((day + r.offset_days) + coalesce(r.at_time, r.default_time, time '09:00'))
      at time zone tz;
  end if;
  day := case r.anchor when 'do_on' then item.do_on else item.due_on end;
  if day is null then
    return null;
  end if;
  return ((day + r.offset_days)
    + coalesce(r.at_time, case when r.anchor = 'do_on' then item.do_at end, r.default_time, time '09:00'))
    at time zone tz;
end
$$;

create or replace function core_private.calculate_alert() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.default_time is null then
    select default_alert_time into new.default_time from core.people where id = new.person_id;
  end if;
  new.fires_at := core_private.alert_fires_at(new);
  return new;
end
$$;

create or replace function core_private.check_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
begin
  select t2.* into t from core.items i join core.item_types t2 on t2.key = i.type where i.id = new.item_id;
  if new.anchor is not null and not new.anchor = any (t.time_fields) then
    raise exception 'A % has no %', t.label, new.anchor using errcode = '23514';
  end if;
  return new;
end
$$;

create or replace function core_private.people_alerts() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.alerts set updated_at = now() where person_id = new.id;
  return null;
end
$$;

create or replace function core_private.sync_alerts()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
  anchor_day date;
  importing boolean := coalesce(current_setting('lifeos.importing', true), '') = 'on';
  gained boolean;
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

  -- Moved out of a Space: who is no longer in it loses their Alerts on
  -- it, and Labels of the old Space come off (a Label is its Item's Space's).
  if tg_op = 'UPDATE' and new.space_id is distinct from old.space_id then
    delete from core.alerts r
    where r.item_id = new.id
      and r.person_id not in (select m.person_id from core.space_members m where m.space_id = new.space_id);
    delete from core.item_labels il using core.labels lb
    where il.item_id = new.id and lb.id = il.label_id and lb.space_id <> new.space_id;
  end if;

  anchor_day := case t.default_alert
    when 'do_on' then new.do_on
    when 'due_on' then new.due_on
    when 'starts_at' then case when new.all_day is not true then new.starts_at::date end
  end;
  if t.default_alert is null or anchor_day is null then
    delete from core.alerts where item_id = new.id and is_default;
  elsif not importing then
    -- Only when it gains the date (or becomes a Type with a default): a
    -- default I removed or changed doesn't come back when the date moves.
    gained := tg_op = 'INSERT' or old.type <> new.type or case t.default_alert
      when 'do_on' then old.do_on
      when 'due_on' then old.due_on
      when 'starts_at' then case when old.all_day is not true then old.starts_at::date end
    end is null;
    if gained then
      perform core_private.give_defaults(new,
        array(select m.person_id from core.space_members m where m.space_id = new.space_id));
    elsif new.space_id is distinct from old.space_id then
      perform core_private.give_defaults(new,
        array(select m.person_id from core.space_members m where m.space_id = new.space_id
              except select m.person_id from core.space_members m where m.space_id = old.space_id));
    end if;
  end if;

  if tg_op = 'UPDATE'
    and (old.do_on, old.do_at, old.due_on, old.starts_at) is distinct from (new.do_on, new.do_at, new.due_on, new.starts_at)
  then
    update core.alerts set snoozed_until = null where item_id = new.id;
  end if;
  return null;
end
$$;

create or replace function core_private.give_defaults(p_item core.items, p_people uuid[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  t core.item_types;
  anchor_day date;
begin
  select * into t from core.item_types where key = p_item.type;
  -- Only on a date the default hangs on (an all-day Event has none).
  anchor_day := case t.default_alert
    when 'do_on' then p_item.do_on
    when 'due_on' then p_item.due_on
    when 'starts_at' then case when p_item.all_day is not true then p_item.starts_at::date end
  end;
  if anchor_day is null then
    return;
  end if;
  insert into core.alerts (item_id, person_id, anchor, offset_minutes, is_default)
  select p_item.id, who, t.default_alert,
    case when t.default_alert = 'starts_at' then -30 else 0 end, true
  from unnest(p_people) who
  where not exists (
      select 1 from core.alerts r where r.item_id = p_item.id and r.person_id = who and r.is_default)
    and coalesce((select (p.alert_defaults ->> p_item.type)::boolean from core.people p where p.id = who), true);
end
$$;

create or replace function core_private.act_on(
  x core.alert_deliveries, p_action text, p_next uuid, p_next_on date)
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
    if x.kind = 'reminder' and x.alert_id is not null then
      update core.alerts set snoozed_until = now() + interval '1 hour'
      where id = x.alert_id and person_id = x.person_id;
    else
      insert into core.alert_deliveries (kind, key, person_id, device_id, item_id, fire_at)
      select x.kind, x.key, x.person_id, d.id, x.item_id, date_trunc('minute', now()) + interval '1 hour'
      from core.push_devices d where d.person_id = x.person_id and d.enabled and d.gone_at is null
      on conflict (key, fire_at, device_id) do nothing;
    end if;
    return true;
  end if;
  return false;
end
$$;

create or replace function core_private.notification_payload(d core.alert_deliveries)
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
  tz := coalesce(tz, 'Europe/London');
  if d.kind = 'digest' then
    select * into c from core_private.day_counts(d.person_id, (now() at time zone tz)::date);
    if c.overdue > 0 then parts := parts || (c.overdue || ' overdue'); end if;
    if c.today > 0 then parts := parts || (c.today || ' today'); end if;
    if c.to_sort > 0 then
      parts := parts || (c.to_sort || case when c.to_sort = 1 then ' thought' else ' thoughts' end);
    end if;
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
  if i.starts_at is not null then
    line := case when i.all_day then to_char((i.starts_at at time zone 'UTC')::date, 'Dy FMDD Mon')
                 else to_char(i.starts_at at time zone tz, 'Dy FMDD Mon HH24:MI') end;
  end if;
  if i.place is not null and btrim(i.place) <> '' then
    line := concat_ws(' · ', line, btrim(i.place));
  end if;
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
    'actions', buttons,
    -- Its Type's colour, which the Android app tints the notification with.
    'colour', t.colour
  );
end
$$;

create or replace function core_private.make_occurrences(p_series core.series, p_occurrences jsonb)
returns void
language plpgsql set search_path = '' as $$
declare
  o jsonb;
  v_id uuid;
  v_on date;
  t jsonb := p_series.template;
  is_event boolean := p_series.type = 'event';
  v_all_day boolean := coalesce((p_series.template ->> 'all_day')::boolean, false);
  v_start timestamptz;
  v_end timestamptz;
begin
  perform set_config('lifeos.series_writing', 'on', true);
  for o in select * from jsonb_array_elements(p_occurrences) loop
    v_on := (o ->> 'on')::date;
    continue when p_series.ended_on is not null and v_on > p_series.ended_on;
    v_id := coalesce((o ->> 'id')::uuid, core_private.uuidv7());
    if is_event then
      if v_all_day then
        v_start := v_on::timestamp at time zone 'UTC';
        v_end := (v_on + coalesce((t ->> 'days')::int, 1))::timestamp at time zone 'UTC';
      else
        v_start := (v_on + coalesce((t ->> 'start_time')::time, time '09:00')) at time zone p_series.timezone;
        v_end := v_start + make_interval(mins => coalesce((t ->> 'duration_minutes')::int, 60));
      end if;
    end if;
    insert into core.items (id, type, title, body, place, space_id, owner_id, status,
                            do_on, do_at, due_on, starts_at, ends_at, all_day,
                            series_id, occurrence_on)
    values (
      v_id,
      p_series.type,
      coalesce(t ->> 'title', ''),
      t ->> 'body',
      case when is_event then nullif(btrim(t ->> 'place'), '') end,
      p_series.space_id,
      p_series.owner_id,
      'active',
      case when not is_event then v_on end,
      case when not is_event then (t ->> 'do_at')::time end,
      case when not is_event then v_on + (t ->> 'due_offset_days')::int end,
      case when is_event then v_start end,
      case when is_event then v_end end,
      case when is_event then v_all_day end,
      p_series.id,
      v_on
    )
    on conflict do nothing;
    if found then
      insert into core.item_labels (item_id, label_id)
      select v_id, l.id from core.labels l
      where l.id in (select value::uuid from jsonb_array_elements_text(coalesce(t -> 'label_ids', '[]')))
      on conflict do nothing;
      insert into core.alerts (item_id, person_id, anchor, offset_days, at_time, offset_minutes, alarm)
      select v_id, p_series.owner_id, r ->> 'anchor', coalesce((r ->> 'offset_days')::int, 0),
        (r ->> 'at_time')::time, coalesce((r ->> 'offset_minutes')::int, 0),
        coalesce((r ->> 'alarm')::boolean, false)
      from jsonb_array_elements(coalesce(t -> 'alerts', t -> 'reminders', '[]')) r
      where r ->> 'anchor' in ('do_on', 'due_on', 'starts_at');
    end if;
  end loop;
  perform set_config('lifeos.series_writing', '', true);
end
$$;

create or replace function core_private.part(p_space uuid, p_person uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  x uuid;
begin
  update core.items set space_id = (
    select s.id from core.spaces s where s.created_by = p_person and s.kind = 'personal'
  )
  where space_id = p_space and owner_id = p_person;
  delete from core.space_members where space_id = p_space and person_id = p_person;

  delete from core.alerts r
  using core.items i
  where r.item_id = i.id and r.person_id = p_person and i.space_id = p_space;

  delete from core.links l
  where l.link_type not in ('uses', 'variation_of')
    and (
      (l.from_item in (select id from core.items where owner_id = p_person)
       and l.to_item in (select id from core.items where space_id = p_space))
      or (l.to_item in (select id from core.items where owner_id = p_person)
       and l.from_item in (select id from core.items where space_id = p_space))
    );

  -- My copies of the Household's Events leave my calendar.
  for x in select c.item_id from core_private.event_copies c join core.items i on i.id = c.item_id
           where c.person_id = p_person and i.space_id = p_space loop
    perform core_private.calendar_queue(p_person, x, null, true);
  end loop;
  for x in select c.series_id from core_private.series_copies c join core.series s on s.id = c.series_id
           where c.person_id = p_person and s.space_id = p_space loop
    perform core_private.calendar_queue(p_person, null, x, true);
  end loop;

  perform food_private.split_variations();
end
$$;

create or replace function core_private.queue_notifications(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = '' as $$
declare
  waiting int;
begin
  -- Alerts that have come due in the last 12 hours (REM-004 1, 3).
  insert into core.alert_deliveries (kind, key, person_id, device_id, alert_id, item_id, fire_at, status)
  select distinct on (r.item_id, d.id, r.fires_at)
    'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at,
    -- The Android app sets its own (ADR-0063): recorded, never sent.
    case when d.kind = 'fcm' and d.secret_hash is not null then 'on_device' else 'waiting' end
  from core.alerts r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
    -- Only what comes due after the device was turned on, not what it missed before.
    and d.created_at <= r.fires_at
  where r.fires_at <= p_now and r.fires_at > p_now - interval '12 hours'
    -- Not one already past when it was set (a Task captured at 15:00 for
    -- today has its 09:00 default behind it).
    and r.fires_at >= r.updated_at - interval '1 minute'
    and core_private.item_open(r.item_id)
    and not exists (
      select 1 from core.alert_deliveries x
      where x.kind = 'reminder' and x.item_id = r.item_id and x.device_id = d.id
        and x.fire_at = r.fires_at and x.key <> 'reminder:' || r.id
    )
  order by r.item_id, d.id, r.fires_at, r.id
  on conflict (key, fire_at, device_id) do nothing;

  -- Ones that couldn't be sent within 12 hours are recorded as missed, not
  -- sent (REM-004 3).
  insert into core.alert_deliveries (kind, key, person_id, device_id, alert_id, item_id, fire_at, status)
  select distinct on (r.item_id, d.id, r.fires_at)
    'reminder', 'reminder:' || r.id, r.person_id, d.id, r.id, r.item_id, r.fires_at, 'missed'
  from core.alerts r
  join core.push_devices d on d.person_id = r.person_id and d.enabled and d.gone_at is null
    and d.created_at <= r.fires_at
  where r.fires_at <= p_now - interval '12 hours' and r.fires_at > p_now - interval '36 hours'
    and r.fires_at >= r.updated_at - interval '1 minute'
    and core_private.item_open(r.item_id)
    and not exists (
      select 1 from core.alert_deliveries x
      where x.kind = 'reminder' and x.item_id = r.item_id and x.device_id = d.id
        and x.fire_at = r.fires_at and x.key <> 'reminder:' || r.id
    )
  order by r.item_id, d.id, r.fires_at, r.id
  on conflict (key, fire_at, device_id) do nothing;

  -- The morning digest at each person's digest time, in their timezone
  -- (REM-008). With nothing to say it is recorded as skipped, so it doesn't
  -- arrive later in the day.
  insert into core.alert_deliveries (kind, key, person_id, device_id, fire_at, status)
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
  insert into core.alert_deliveries (kind, key, person_id, device_id, item_id, fire_at)
  select 'overdue', 'overdue:' || i.id || ':' || i.due_on, p.id, d.id, i.id, local.at
  from core.people p
  cross join lateral (
    select (p_now at time zone p.timezone)::date as day,
      ((p_now at time zone p.timezone)::date + p.default_alert_time) at time zone p.timezone as at
  ) local
  join core.space_members m on m.person_id = p.id
  join core.items i on i.space_id = m.space_id and i.type = 'task' and i.status = 'active'
    and i.archived_at is null and i.due_on < local.day
  join core.push_devices d on d.person_id = p.id and d.enabled and d.gone_at is null
    and d.created_at <= local.at
  where not p.digest_on and local.at <= p_now and local.at > p_now - interval '12 hours'
    and not exists (
      select 1 from core.alert_deliveries x
      where x.key = 'overdue:' || i.id || ':' || i.due_on and x.person_id = p.id
    )
  on conflict (key, fire_at, device_id) do nothing;

  -- A sender that stopped mid-way leaves rows claimed: they count too.
  select count(*)::int into waiting from core.alert_deliveries
  where (status in ('waiting', 'failed')
      or (status = 'sending' and claimed_at < p_now - interval '5 minutes'))
    and fire_at <= p_now;
  return waiting;
end
$$;

create or replace function core_private.want_look_items()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices set look_wanted_at = now()
  where kind = 'fcm' and secret_hash is not null and enabled and gone_at is null
    and look_wanted_at is null
    and person_id in (
      select r.person_id from core.alerts r
      join new_rows n on n.id = r.item_id
      join old_rows o on o.id = n.id
      where n.status is distinct from o.status or n.archived_at is distinct from o.archived_at
    );
  return null;
end
$$;

create or replace function core.add_alert(p_id uuid, p_item uuid, p_fields jsonb)
returns core.alerts
language plpgsql set search_path = '' as $$
declare
  r core.alerts;
begin
  perform core_private.check_alert_fields(p_fields);
  insert into core.alerts (id, item_id, anchor, offset_days, at_time, offset_minutes, fixed_at, alarm)
  values (
    p_id,
    p_item,
    p_fields ->> 'anchor',
    coalesce((p_fields ->> 'offset_days')::int, 0),
    (p_fields ->> 'at_time')::time,
    coalesce((p_fields ->> 'offset_minutes')::int, 0),
    (p_fields ->> 'fixed_at')::timestamptz,
    coalesce((p_fields ->> 'alarm')::boolean, false)
  )
  on conflict (id) do nothing;
  select * into r from core.alerts where id = p_id;
  return r;
end
$$;

create or replace function core.update_alert(p_id uuid, p_patch jsonb)
returns core.alerts
language plpgsql set search_path = '' as $$
declare
  r core.alerts;
begin
  perform core_private.check_alert_fields(p_patch);
  update core.alerts x set
    anchor = case when p_patch ? 'anchor' then p_patch ->> 'anchor' else x.anchor end,
    offset_days = case when p_patch ? 'offset_days' then coalesce((p_patch ->> 'offset_days')::int, 0) else x.offset_days end,
    at_time = case when p_patch ? 'at_time' then (p_patch ->> 'at_time')::time else x.at_time end,
    offset_minutes = case when p_patch ? 'offset_minutes' then coalesce((p_patch ->> 'offset_minutes')::int, 0) else x.offset_minutes end,
    fixed_at = case when p_patch ? 'fixed_at' then (p_patch ->> 'fixed_at')::timestamptz else x.fixed_at end,
    alarm = case when p_patch ? 'alarm' then coalesce((p_patch ->> 'alarm')::boolean, false) else x.alarm end,
    is_default = false,
    snoozed_until = null
  where x.id = p_id
  returning * into r;
  if r.id is null then
    raise exception 'No Alert % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create or replace function core.remove_alert(p_id uuid)
returns void
language sql set search_path = '' as $$
  delete from core.alerts where id = p_id
$$;

create or replace function core.remove_default_alert(p_item uuid)
returns void
language sql set search_path = '' as $$
  delete from core.alerts
  where item_id = p_item and is_default and person_id = (select auth.uid())
$$;

create or replace function core.snooze_alert(p_id uuid, p_until timestamptz)
returns core.alerts
language plpgsql set search_path = '' as $$
declare
  r core.alerts;
begin
  update core.alerts set snoozed_until = p_until where id = p_id returning * into r;
  if r.id is null then
    raise exception 'No Alert % to snooze', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

create or replace function core.update_settings(p_patch jsonb)
returns core.people
language plpgsql set search_path = '' as $$
declare
  r core.people;
begin
  -- The names before Alerts (ADR-0065), from a write queued then: taken as the new.
  if p_patch ? 'default_reminder_time' then
    p_patch := (p_patch - 'default_reminder_time') || jsonb_build_object('default_alert_time', p_patch -> 'default_reminder_time');
  end if;
  if p_patch ? 'reminder_defaults' then
    p_patch := (p_patch - 'reminder_defaults') || jsonb_build_object('alert_defaults', p_patch -> 'reminder_defaults');
  end if;
  if exists (select 1 from jsonb_object_keys(p_patch) k
             where k not in ('name', 'timezone', 'default_alert_time', 'alert_defaults',
                             'digest_on', 'digest_time', 'plan_hidden_types', 'meal_space_id')) then
    raise exception 'Unknown field in %', p_patch using errcode = '22023';
  end if;
  if p_patch ? 'timezone' and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_patch ->> 'timezone') then
    raise exception 'Unknown timezone %', p_patch ->> 'timezone' using errcode = '22023';
  end if;
  if p_patch ? 'plan_hidden_types' and exists (
    select 1 from jsonb_array_elements_text(p_patch -> 'plan_hidden_types') k
    where not exists (select 1 from core.item_types t where t.key = k and t.schedulable)
  ) then
    raise exception 'Plan shows only Types that can be planned' using errcode = '22023';
  end if;
  if p_patch ->> 'meal_space_id' is not null and (p_patch ->> 'meal_space_id')::uuid not in (
    select core_private.my_space_ids()
  ) then
    raise exception 'New meals go to Personal or one of my Households' using errcode = '42501';
  end if;
  update core.people p set
    name = case when p_patch ? 'name' then coalesce(p_patch ->> 'name', '') else p.name end,
    timezone = case when p_patch ? 'timezone' then p_patch ->> 'timezone' else p.timezone end,
    default_alert_time = case when p_patch ? 'default_alert_time' then (p_patch ->> 'default_alert_time')::time else p.default_alert_time end,
    alert_defaults = case when p_patch ? 'alert_defaults' then p.alert_defaults || (p_patch -> 'alert_defaults') else p.alert_defaults end,
    digest_on = case when p_patch ? 'digest_on' then (p_patch ->> 'digest_on')::boolean else p.digest_on end,
    digest_time = case when p_patch ? 'digest_time' then (p_patch ->> 'digest_time')::time else p.digest_time end,
    plan_hidden_types = case when p_patch ? 'plan_hidden_types'
      then array(select distinct jsonb_array_elements_text(p_patch -> 'plan_hidden_types') order by 1)
      else p.plan_hidden_types end,
    meal_space_id = case when p_patch ? 'meal_space_id' then (p_patch ->> 'meal_space_id')::uuid else p.meal_space_id end
  where p.id = (select auth.uid())
  returning * into r;
  return r;
end
$$;

create or replace function core.convert_item(p_id uuid, p_type text)
returns core.items
language plpgsql set search_path = '' as $$
declare
  r core.items;
  tz text;
begin
  select * into r from core.items where id = p_id;
  if r.id is null then
    raise exception 'No Item % to convert', p_id using errcode = 'P0002';
  end if;
  if r.type = p_type then
    return r;
  end if;
  tz := core_private.home_timezone(r.owner_id);

  if (r.type = 'task' and p_type = 'event') or (r.type = 'event' and p_type = 'task') then
    delete from core.alerts where item_id = p_id and is_default;
    update core.alerts set anchor = null, fixed_at = fires_at, offset_days = 0,
      offset_minutes = 0, at_time = null
    where item_id = p_id and anchor is not null and fires_at is not null;
    delete from core.alerts where item_id = p_id and anchor is not null;
  end if;

  update core.items i set
    type = p_type,
    status = case
      when i.status = any (coalesce((select t.statuses from core.item_types t where t.key = p_type), array[i.status]))
        then i.status
      else 'active'
    end,
    starts_at = case
      when i.type = 'task' and p_type = 'event' and i.do_on is not null then
        case when i.do_at is null then i.do_on::timestamp at time zone 'UTC'
             else (i.do_on + i.do_at) at time zone tz end
      when p_type = 'task' then null
      else i.starts_at
    end,
    ends_at = case
      when i.type = 'task' and p_type = 'event' and i.do_on is not null then
        case when i.do_at is null then (i.do_on + 1)::timestamp at time zone 'UTC'
             else (i.do_on + i.do_at) at time zone tz + interval '1 hour' end
      when p_type = 'task' then null
      else i.ends_at
    end,
    all_day = case
      when i.type = 'task' and p_type = 'event' and i.do_on is not null then i.do_at is null
      when p_type = 'task' then null
      else i.all_day
    end,
    do_on = case
      when i.type = 'event' and p_type = 'task' and i.starts_at is not null then
        case when i.all_day then (i.starts_at at time zone 'UTC')::date
             else (i.starts_at at time zone tz)::date end
      when p_type = 'event' then null
      else i.do_on
    end,
    do_at = case
      when i.type = 'event' and p_type = 'task' and i.starts_at is not null and i.all_day is not true then
        (i.starts_at at time zone tz)::time
      when p_type = 'event' then null
      else i.do_at
    end,
    due_on = case when p_type = 'event' then null else i.due_on end,
    place = case when p_type = 'task' then null else i.place end
  where i.id = p_id;
  select * into r from core.items where id = p_id;
  return r;
end
$$;

create or replace function core.act_on_delivery(
  p_delivery bigint, p_token uuid, p_action text, p_next uuid default null, p_next_on date default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  x core.alert_deliveries;
begin
  select * into x from core.alert_deliveries where id = p_delivery and token = p_token;
  if x.id is null then
    return false;
  end if;
  return core_private.act_on(x, p_action, p_next, p_next_on);
end
$$;

create or replace function core.claim_deliveries(p_limit integer default 100)
returns table(id bigint, kind text, endpoint text, p256dh text, auth text, ttl integer, payload jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  update core.alert_deliveries x set status = 'skipped'
  from core.push_devices d
  where d.id = x.device_id and x.status in ('waiting', 'failed') and x.fire_at <= now()
    and (not d.enabled or d.gone_at is not null
         or (x.kind <> 'digest' and not core_private.item_open(x.item_id))
         or (x.kind <> 'digest' and not core_private.readable_by(x.person_id, x.item_id))
         or (x.kind = 'reminder' and x.alert_id is null));
  update core.alert_deliveries x set status = 'missed'
  where x.status in ('waiting', 'failed') and x.fire_at <= now() - interval '12 hours';

  return query
  with taken as (
    select x.id from core.alert_deliveries x
    where x.fire_at <= now()
      and (x.status in ('waiting', 'failed')
           or (x.status = 'sending' and x.claimed_at < now() - interval '5 minutes'))
    order by x.fire_at
    limit least(greatest(p_limit, 1), 500)
    for update skip locked
  ), claimed as (
    update core.alert_deliveries x
    set status = 'sending', claimed_at = now(), attempts = x.attempts + 1
    from taken where x.id = taken.id
    returning x.*
  )
  select c.id, d.kind, d.endpoint, d.p256dh, d.auth,
    greatest(60, extract(epoch from (c.fire_at + interval '12 hours' - now()))::int),
    core_private.notification_payload(c) || jsonb_build_object('delivery', c.id, 'token', c.token)
  from claimed c join core.push_devices d on d.id = c.device_id;
end
$$;

create or replace function core.delivery_for_action(p_delivery bigint, p_token uuid)
returns table (item_id uuid, kind text, mode text, rule text, timezone text)
language sql stable security definer set search_path = '' as $$
  select x.item_id, x.kind, s.mode, s.rule, s.timezone
  from core.alert_deliveries x
  left join core.items i on i.id = x.item_id
  left join core.series s on s.id = i.series_id and s.ended_on is null
  where x.id = p_delivery and x.token = p_token
$$;

create or replace function core.record_deliveries(p_results jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  dev uuid;
begin
  for r in select * from jsonb_array_elements(p_results) loop
    update core.alert_deliveries set
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

create or replace function core.device_alerts(p_device uuid, p_secret text)
returns table (alert_id uuid, fires_at timestamptz, payload jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := core_private.device_person(p_device, p_secret);
begin
  if me is null then
    raise exception 'Not a device' using errcode = '42501';
  end if;
  return query
  select f.id, f.fires_at, p.payload || jsonb_build_object('alarm', f.alarm, 'type', i.type)
  from (
    select distinct on (r.item_id, r.fires_at) r.id, r.item_id, r.fires_at, r.alarm
    from core.alerts r
    where r.person_id = me
      and r.fires_at > now() - interval '12 hours' and r.fires_at <= now() + interval '7 days'
      and r.fires_at >= r.updated_at - interval '1 minute'
      and core_private.item_open(r.item_id)
      and core_private.readable_by(me, r.item_id)
    order by r.item_id, r.fires_at, r.alarm desc, r.id
  ) f
  join core.items i on i.id = f.item_id
  cross join lateral (
    select core_private.notification_payload(
      jsonb_populate_record(null::core.alert_deliveries, jsonb_build_object(
        'kind', 'reminder', 'key', 'reminder:' || f.id, 'person_id', me,
        'item_id', f.item_id, 'alert_id', f.id, 'fire_at', f.fires_at))) as payload
  ) p
  order by f.fires_at
  limit 400;
end
$$;

create or replace function core.alert_for_action(p_device uuid, p_secret text, p_alert uuid)
returns table (item_id uuid, kind text, mode text, rule text, timezone text)
language sql stable security definer set search_path = '' as $$
  select r.item_id, 'reminder'::text, s.mode, s.rule, s.timezone
  from core.alerts r
  left join core.items i on i.id = r.item_id
  left join core.series s on s.id = i.series_id and s.ended_on is null
  where r.id = p_alert and r.person_id = core_private.device_person(p_device, p_secret)
$$;

create or replace function core.act_on_alert(
  p_device uuid, p_secret text, p_alert uuid, p_action text,
  p_next uuid default null, p_next_on date default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := core_private.device_person(p_device, p_secret);
  r core.alerts;
begin
  select * into r from core.alerts where id = p_alert and person_id = me;
  if me is null or r.id is null then
    return false;
  end if;
  return core_private.act_on(
    jsonb_populate_record(null::core.alert_deliveries, jsonb_build_object(
      'kind', 'reminder', 'key', 'reminder:' || r.id, 'person_id', me,
      'item_id', r.item_id, 'alert_id', r.id, 'device_id', p_device)),
    p_action, p_next, p_next_on);
end
$$;

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

  select count(*)::int into stuck from core.alert_deliveries
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

grant execute on function core_private.check_alert_fields(jsonb) to authenticated;
grant execute on function core_private.alert_fires_at(core.alerts) to authenticated;
grant execute on function core.add_alert(uuid, uuid, jsonb) to authenticated;
grant execute on function core.update_alert(uuid, jsonb) to authenticated;
grant execute on function core.remove_alert(uuid) to authenticated;
grant execute on function core.remove_default_alert(uuid) to authenticated;
grant execute on function core.snooze_alert(uuid, timestamptz) to authenticated;
grant execute on function core.device_alerts(uuid, text) to service_role;
grant execute on function core.alert_for_action(uuid, text, uuid) to service_role;
grant execute on function core.act_on_alert(uuid, text, uuid, text, uuid, date) to service_role;
revoke execute on function core_private.calculate_alert(), core_private.check_alert(),
  core_private.people_alerts(), core_private.sync_alerts() from public, anon, authenticated;

-- The triggers, on the new functions.
drop trigger reminders_check on core.alerts;
create trigger alerts_check before insert or update of anchor, item_id on core.alerts
for each row execute function core_private.check_alert();
drop trigger reminders_calculate on core.alerts;
create trigger alerts_calculate before insert or update on core.alerts
for each row execute function core_private.calculate_alert();
alter trigger reminders_updated_at on core.alerts rename to alerts_updated_at;
alter trigger reminders_look_updated on core.alerts rename to alerts_look_updated;
alter trigger reminders_look_inserted on core.alerts rename to alerts_look_inserted;
alter trigger reminders_look_deleted on core.alerts rename to alerts_look_deleted;
drop trigger people_reminders on core.people;
create trigger people_alerts after update of timezone on core.people
for each row when (old.timezone is distinct from new.timezone) execute function core_private.people_alerts();
drop trigger items_reminders on core.items;
create trigger items_alerts after insert or update of type, do_on, do_at, due_on, starts_at, space_id on core.items
for each row execute function core_private.sync_alerts();

drop function core_private.calculate_reminder();
drop function core_private.check_reminder();
drop function core_private.people_reminders();
drop function core_private.sync_reminders();
drop function core_private.reminder_fires_at(core.alerts);
drop function core_private.check_reminder_fields(jsonb);

-- A repeat's template keeps its Alerts under `alerts` (make_occurrences
-- reads `reminders` too, for a repeat written by the app before this).
update core.series set template = (template - 'reminders') || jsonb_build_object('alerts', template -> 'reminders')
where template ? 'reminders';

-- Until step 10: the old names, for what may still call them.
create view core.reminders with (security_invoker = true) as select * from core.alerts;
alter table core.people
  add column default_reminder_time time generated always as (default_alert_time) stored,
  add column reminder_defaults jsonb generated always as (alert_defaults) stored;
grant select on core.reminders to authenticated;

create or replace function core.add_reminder(p_id uuid, p_item uuid, p_fields jsonb)
returns core.alerts language sql set search_path = '' as $$
  select * from core.add_alert(p_id, p_item, p_fields)
$$;
create or replace function core.update_reminder(p_id uuid, p_patch jsonb)
returns core.alerts language sql set search_path = '' as $$
  select * from core.update_alert(p_id, p_patch)
$$;
create or replace function core.remove_reminder(p_id uuid)
returns void language sql set search_path = '' as $$
  select core.remove_alert(p_id)
$$;
create or replace function core.remove_default_reminder(p_item uuid)
returns void language sql set search_path = '' as $$
  select core.remove_default_alert(p_item)
$$;
create or replace function core.snooze_reminder(p_id uuid, p_until timestamptz)
returns core.alerts language sql set search_path = '' as $$
  select * from core.snooze_alert(p_id, p_until)
$$;
create or replace function core.device_reminders(p_device uuid, p_secret text)
returns table (reminder_id uuid, fires_at timestamptz, payload jsonb)
language sql stable security definer set search_path = '' as $$
  select * from core.device_alerts(p_device, p_secret)
$$;
create or replace function core.reminder_for_action(p_device uuid, p_secret text, p_reminder uuid)
returns table (item_id uuid, kind text, mode text, rule text, timezone text)
language sql stable security definer set search_path = '' as $$
  select * from core.alert_for_action(p_device, p_secret, p_reminder)
$$;
create or replace function core.act_on_reminder(
  p_device uuid, p_secret text, p_reminder uuid, p_action text,
  p_next uuid default null, p_next_on date default null)
returns boolean language sql security definer set search_path = '' as $$
  select core.act_on_alert(p_device, p_secret, p_reminder, p_action, p_next, p_next_on)
$$;
