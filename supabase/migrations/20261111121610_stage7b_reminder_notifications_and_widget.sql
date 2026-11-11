-- Stage 7b, step 10a: a Reminder's notification and the widget as Today,
-- all on the server, so the installed Android app has them without a new
-- release (ADR-0065 2, 10). A Reminder's notification says its Alert's time
-- and offers Done, which only clears it (RMD-005); the widget's cards are
-- Today's list (TDY-006 1); and `core.plan_items` places a Reminder on the
-- days its Alerts fall, as the app does.

-- When an Alert of a Reminder goes off, as src/lib/plan.ts alertTimes works
-- it out: snoozed, where the snooze puts it; on the Reminder's day and its
-- offset from it, at its time; else where the database says it fires.
create function core_private.alert_at(a core.alerts, p_do_on date, tz text)
returns timestamptz
language sql stable set search_path = '' as $$
  select case
    when a.snoozed_until is not null and a.snoozed_until > now() then a.snoozed_until
    when a.anchor = 'do_on' and p_do_on is not null and a.at_time is not null
      then ((p_do_on + a.offset_days) + a.at_time) at time zone tz
    else a.fires_at
  end
$$;
-- Plan's read, run as the person, asks it too.
revoke execute on function core_private.alert_at(core.alerts, date, text) from public, anon;
grant execute on function core_private.alert_at(core.alerts, date, text) to authenticated;

-- RMD-005 2: Done on a Reminder's notification clears it and changes
-- nothing else; Done on anything else not Completable is still refused.
create or replace function core_private.act_on(x core.alert_deliveries, p_action text, p_next uuid, p_next_on date)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  i core.items;
  s core.series;
begin
  select * into i from core.items where id = x.item_id;

  if p_action = 'done' then
    if i.id is not null and i.type = 'reminder' then
      return true;
    end if;
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

-- RMD-005 1: a Reminder's notification says its Alert's time, and offers
-- Done (an Item that can be ticked off, or a Reminder) and Snooze.
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
    if cardinality(parts) = 0 then
      return null;
    end if;
    return jsonb_build_object('title', array_to_string(parts, ' · '), 'body', '', 'url', '/today',
                              'tag', d.key, 'actions', '[]'::jsonb);
  end if;

  select * into i from core.items where id = d.item_id;
  if i.id is null or i.archived_at is not null or i.status not in ('active', 'idea') then
    return null;
  end if;
  select * into t from core.item_types where key = i.type;
  if i.type = 'reminder' then
    line := to_char(d.fire_at at time zone tz, 'Dy FMDD Mon HH24:MI');
  end if;
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
  if t.completable or i.type = 'reminder' then
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

-- TDY-006 1: a day's cards for the widget as Today lists them
-- (src/lib/today.ts todayList, src/lib/today-widget.ts widgetDays): my
-- overdue Tasks first, saying "Overdue", oldest due first; then the day,
-- Anytime, Morning, Afternoon, Evening, each by time, Meals by slot, then
-- position, when made and id. A repeating Task shows its next open
-- occurrence only; one to do on an earlier day and not done stays, and one
-- ticked on the day stays. A Reminder is on each day an Alert of mine falls,
-- at its first time that day, fading after its last. A Meal fades once its
-- part of the day has gone.
create function core_private.today_cards(p_me uuid, p_tz text, p_day date)
returns jsonb
language sql stable set search_path = '' as $$
  with mine as (
    select i.*, t.colour as type_colour,
      coalesce(
        nullif(btrim(i.title), ''),
        (select nullif(btrim(l), '') from unnest(string_to_array(coalesce(i.body, ''), E'\n')) l
         where btrim(l) <> '' limit 1),
        'Untitled') as shown_title
    from core.items i
    join core.item_types t on t.key = i.type and t.schedulable
    where i.archived_at is null
      and i.status not in ('cancelled', 'idea')
      and core_private.readable_by(p_me, i.id)
  ),
  -- A repeating Task: an untouched occurrence overtaken by a newer one come
  -- due is skipped, and of the rest only the next shows (src/lib/series.ts).
  series_due as (
    select o.series_id, max(coalesce(o.occurrence_on, o.do_on)) as latest_due
    from core.items o
    where o.type = 'task' and o.series_id is not null and o.archived_at is null and o.do_on <= p_day
    group by o.series_id
  ),
  next_open as (
    select distinct on (o.series_id) o.id
    from core.items o
    left join series_due s on s.series_id = o.series_id
    where o.type = 'task' and o.series_id is not null and o.archived_at is null
      and o.status in ('active', 'idea')
      and not (o.touched_at is null and s.latest_due is not null
               and coalesce(o.occurrence_on, o.do_on) < s.latest_due)
    order by o.series_id, coalesce(o.do_on, o.occurrence_on) nulls first,
      coalesce(o.occurrence_on, o.do_on) nulls first
  ),
  shown as (
    select m.* from mine m
    where m.type <> 'task' or m.series_id is null or m.status not in ('active', 'idea')
      or m.id in (select id from next_open)
  ),
  overdue as (
    select s.* from shown s where s.type = 'task' and s.status = 'active' and s.due_on < p_day
  ),
  -- A Reminder's Alerts that fall on the day.
  reminder_day as (
    select s.id, min(x.at) as first_at, max(x.at) as last_at
    from shown s
    join core.alerts a on a.item_id = s.id and a.person_id = p_me
    cross join lateral (select core_private.alert_at(a, s.do_on, p_tz) as at) x
    where s.type = 'reminder' and x.at is not null and (x.at at time zone p_tz)::date = p_day
    group by s.id
  ),
  placed as (
    -- Everything but Reminders on its days, as Week has it (src/lib/plan.ts placeOf).
    select s.*,
      case
        when s.starts_at is not null and s.all_day then (s.starts_at at time zone 'UTC')::date
        when s.starts_at is not null then (s.starts_at at time zone p_tz)::date
        else coalesce(s.do_on, s.due_on)
      end as first_day,
      case
        when s.starts_at is not null and s.all_day then
          greatest((coalesce(s.ends_at, s.starts_at + interval '1 day') at time zone 'UTC')::date - 1,
                   (s.starts_at at time zone 'UTC')::date)
        when s.starts_at is not null then
          greatest(((coalesce(s.ends_at, s.starts_at) - interval '1 millisecond') at time zone p_tz)::date,
                   (s.starts_at at time zone p_tz)::date)
        else coalesce(s.do_on, s.due_on)
      end as last_day,
      case
        when s.starts_at is not null and s.all_day then
          (coalesce(s.ends_at, s.starts_at + interval '1 day') at time zone 'UTC')::date - 1
        when s.starts_at is not null then (coalesce(s.ends_at, s.starts_at) at time zone p_tz)::date
      end as end_day
    from shown s
    where s.type <> 'reminder' and s.id not in (select id from overdue)
  ),
  on_day as (
    select p.*,
      case
        when p.starts_at is not null and not p.all_day and p.first_day = p_day
          then to_char(p.starts_at at time zone p_tz, 'HH24:MI')
        when p.starts_at is null and p.do_on is not null and p.do_at is not null
          then to_char(p.do_at, 'HH24:MI')
        else ''
      end as at,
      case
        when p.starts_at is not null then
          case
            when p.all_day or (p.first_day < p_day and (p.last_day > p_day or p.end_day > p_day)) then 'All day'
            when p.first_day < p_day then 'Until ' || to_char(p.ends_at at time zone p_tz, 'HH24:MI')
            else to_char(p.starts_at at time zone p_tz, 'HH24:MI')
          end
        when p.slot is not null then initcap(p.slot)
        when p.do_on is not null and p.do_at is not null then to_char(p.do_at, 'HH24:MI')
      end as time_text,
      case
        when p.starts_at is not null then p.ends_at
        when p.slot = 'breakfast' then (p_day + time '12:00') at time zone p_tz
        when p.slot = 'lunch' then (p_day + time '17:00') at time zone p_tz
      end as fades_at
    from placed p
    where (p.first_day <= p_day and p.last_day >= p_day)
      -- A Task left from an earlier day: still to do, or ticked on the day.
      or (p.type = 'task' and p.do_on < p_day
          and (p.status = 'active'
               or (p.status = 'done' and (p.updated_at at time zone p_tz)::date = p_day)))
  ),
  cards as (
    select 0 as grp, 0 as part, o.due_on::text as k1, coalesce(to_char(o.do_at, 'HH24:MI'), '~') as k2,
      0 as slot_rank, '' as pos, o.created_at, o.id,
      jsonb_build_object('id', o.id, 'type', o.type, 'colour', o.type_colour, 'title', o.shown_title,
        'time', 'Overdue', 'done', false, 'ends', null) as card
    from overdue o
    union all
    select 1,
      case
        when d.slot = 'breakfast' then 1 when d.slot = 'lunch' then 2 when d.slot = 'dinner' then 3
        when d.at = '' then 0 when d.at < '12:00' then 1 when d.at < '17:00' then 2 else 3
      end,
      d.at, '', case d.slot when 'breakfast' then 1 when 'lunch' then 2 when 'dinner' then 3 else 0 end,
      coalesce(d.position, ''), d.created_at, d.id,
      jsonb_build_object('id', d.id, 'type', d.type, 'colour', d.type_colour, 'title', d.shown_title,
        'time', d.time_text, 'done', d.status = 'done', 'ends', d.fades_at)
    from on_day d
    union all
    select 1,
      case when to_char(r.first_at at time zone p_tz, 'HH24:MI') < '12:00' then 1
           when to_char(r.first_at at time zone p_tz, 'HH24:MI') < '17:00' then 2 else 3 end,
      to_char(r.first_at at time zone p_tz, 'HH24:MI'), '', 0, coalesce(s.position, ''), s.created_at, s.id,
      jsonb_build_object('id', s.id, 'type', s.type, 'colour', s.type_colour, 'title', s.shown_title,
        'time', to_char(r.first_at at time zone p_tz, 'HH24:MI'), 'done', false, 'ends', r.last_at)
    from reminder_day r join shown s on s.id = r.id
  )
  select coalesce(
    jsonb_agg(card order by grp, part, k1 collate "C", k2 collate "C", slot_rank, pos collate "C",
      created_at, id),
    '[]'::jsonb)
  from cards
$$;
revoke execute on function core_private.today_cards(uuid, text, date) from public, anon, authenticated;

-- The widget's feed: today's and tomorrow's cards (ADR-0064, TDY-006), so
-- it turns at midnight with nothing to fetch. Every Type Today shows; Week's
-- hidden Types are Week's alone.
create or replace function core.device_plan(p_device uuid, p_secret text)
returns table (day date, cards jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := core_private.device_person(p_device, p_secret);
  tz text;
  today date;
begin
  if me is null then
    raise exception 'Not a device' using errcode = '42501';
  end if;
  select coalesce(p.timezone, 'Europe/London') into tz from core.people p where p.id = me;
  tz := coalesce(tz, 'Europe/London');
  today := (now() at time zone tz)::date;
  return query
  select g::date, core_private.today_cards(me, tz, g::date)
  from generate_series(today, today + 1, interval '1 day') g
  order by 1;
end
$$;

-- Plan's read places a Reminder from the first to the last day an Alert of
-- mine falls (ADR-0065 2); the app places it on each of those days.
create or replace function core.plan_items(p_from date, p_to date)
returns table (
  item core.items,
  plan_from date,
  plan_to date,
  repeats boolean,
  calendar_name text,
  calendar_level text
)
language sql stable set search_path = '' as $$
  with me as (
    select coalesce((select p.timezone from core.people p where p.id = (select auth.uid())),
                    'Europe/London') as tz
  ),
  reminder_days as (
    select i.id,
      min((core_private.alert_at(a, i.do_on, me.tz) at time zone me.tz)::date) as first_day,
      max((core_private.alert_at(a, i.do_on, me.tz) at time zone me.tz)::date) as last_day
    from core.items i
    join core.alerts a on a.item_id = i.id and a.person_id = (select auth.uid())
    cross join me
    where i.type = 'reminder' and i.archived_at is null
    group by i.id
  ),
  candidates as (
    select i as it from core.items i
    join core.item_types t on t.key = i.type and t.schedulable
    where i.archived_at is null
      and i.status <> 'cancelled'
      and (
        i.do_on between p_from and p_to
        or i.due_on between p_from and p_to
        or (i.starts_at < (p_to + 2)::timestamp at time zone 'UTC'
            and coalesce(i.ends_at, i.starts_at) >= (p_from - 1)::timestamp at time zone 'UTC')
        or i.id in (select r.id from reminder_days r where r.first_day <= p_to and r.last_day >= p_from)
      )
  ),
  placed as (
    select c.it,
      case
        when (c.it).type = 'reminder' then
          coalesce((select r.first_day from reminder_days r where r.id = (c.it).id), (c.it).do_on)
        when (c.it).starts_at is not null and (c.it).all_day then ((c.it).starts_at at time zone 'UTC')::date
        when (c.it).starts_at is not null then ((c.it).starts_at at time zone me.tz)::date
        else coalesce((c.it).do_on, (c.it).due_on)
      end as first_day,
      case
        when (c.it).type = 'reminder' then
          coalesce((select r.last_day from reminder_days r where r.id = (c.it).id), (c.it).do_on)
        when (c.it).starts_at is not null and (c.it).all_day then
          greatest((coalesce((c.it).ends_at, (c.it).starts_at + interval '1 day') at time zone 'UTC')::date - 1,
                   ((c.it).starts_at at time zone 'UTC')::date)
        when (c.it).starts_at is not null then
          greatest(((coalesce((c.it).ends_at, (c.it).starts_at) - interval '1 microsecond') at time zone me.tz)::date,
                   ((c.it).starts_at at time zone me.tz)::date)
        else coalesce((c.it).do_on, (c.it).due_on)
      end as last_day
    from candidates c, me
  )
  select p.it, p.first_day, p.last_day, (p.it).series_id is not null,
    l.name, case when e.item_id is null then null else coalesce(l.level, 'incoming') end
  from placed p
  left join core.external_refs e on e.item_id = (p.it).id
  left join core.calendar_links l on l.id = e.calendar_link_id
  where p.first_day <= p_to and p.last_day >= p_from
  order by p.first_day, (p.it).all_day is not true, (p.it).starts_at nulls first,
    (p.it).do_at nulls first, (p.it).position, (p.it).id
$$;

-- The widget shows overdue Tasks and those left from an earlier day, so a
-- change to anything dated before today tells the phone to look again too.
-- (A change to an Alert already does, through the mark the phone's
-- Alerts share.)
create or replace function core_private.near_today(p_do_on date, p_due_on date, p_starts timestamptz, p_ends timestamptz)
returns boolean
language sql stable set search_path = '' as $$
  select coalesce(p_do_on, p_due_on) <= current_date + 2
    or (p_starts < now() + interval '3 days' and coalesce(p_ends, p_starts) > now() - interval '2 days')
$$;
