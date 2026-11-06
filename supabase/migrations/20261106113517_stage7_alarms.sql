-- Stage 7, step 8b: Alarms (REM-011, ADR-0063). A Reminder can be marked
-- an Alarm, off by default, on any device; the Android app rings it, and
-- elsewhere it is an ordinary notification, so Web Push is unchanged. The
-- phone reads the flag, and the Item's Type for the Alarm screen's tile,
-- with each firing from device_reminders.

alter table core.reminders add column alarm boolean not null default false;
comment on column core.reminders.alarm is
  'Rings until stopped on the Android app (REM-011); elsewhere an ordinary notification.';

create or replace function core_private.check_reminder_fields(p_fields jsonb) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if exists (select 1 from jsonb_object_keys(p_fields) k
             where k not in ('anchor', 'offset_days', 'at_time', 'offset_minutes', 'fixed_at', 'alarm')) then
    raise exception 'Unknown field in %', p_fields using errcode = '22023';
  end if;
end
$$;

create or replace function core.add_reminder(p_id uuid, p_item uuid, p_fields jsonb)
returns core.reminders
language plpgsql set search_path = '' as $$
declare
  r core.reminders;
begin
  perform core_private.check_reminder_fields(p_fields);
  insert into core.reminders (id, item_id, anchor, offset_days, at_time, offset_minutes, fixed_at, alarm)
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
  select * into r from core.reminders where id = p_id;
  return r;
end
$$;

-- Changing a Reminder makes it the person's own: it no longer follows the
-- Type's default, and a snooze ends.
create or replace function core.update_reminder(p_id uuid, p_patch jsonb)
returns core.reminders
language plpgsql set search_path = '' as $$
declare
  r core.reminders;
begin
  perform core_private.check_reminder_fields(p_patch);
  update core.reminders x set
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
    raise exception 'No Reminder % to update', p_id using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- What the phone reads: as before, each firing's notification, now with
-- whether it is an Alarm and the Item's Type (its tile on the Alarm
-- screen). Two of an Item's Reminders at one minute are one firing, an
-- Alarm if either is.
create or replace function core.device_reminders(p_device uuid, p_secret text)
returns table (reminder_id uuid, fires_at timestamptz, payload jsonb)
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
    from core.reminders r
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
      jsonb_populate_record(null::core.reminder_deliveries, jsonb_build_object(
        'kind', 'reminder', 'key', 'reminder:' || f.id, 'person_id', me,
        'item_id', f.item_id, 'reminder_id', f.id, 'fire_at', f.fires_at))) as payload
  ) p
  order by f.fires_at
  limit 400;
end
$$;

-- A repeated Item's occurrences keep its Reminders' Alarm (the series template
-- carries it, REM-002 4).
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
      insert into core.reminders (item_id, person_id, anchor, offset_days, at_time, offset_minutes, alarm)
      select v_id, p_series.owner_id, r ->> 'anchor', coalesce((r ->> 'offset_days')::int, 0),
        (r ->> 'at_time')::time, coalesce((r ->> 'offset_minutes')::int, 0),
        coalesce((r ->> 'alarm')::boolean, false)
      from jsonb_array_elements(coalesce(t -> 'reminders', '[]')) r
      where r ->> 'anchor' in ('do_on', 'due_on', 'starts_at');
    end if;
  end loop;
  perform set_config('lifeos.series_writing', '', true);
end
$$;
