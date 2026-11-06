-- Stage 7, step 10: the Today widget (WID-002, ADR-0064). The phone reads
-- today's and tomorrow's cards for its person as Plan shows them, and is
-- told to look again when they change elsewhere.

-- The day's cards as Plan works them out (src/lib/plan.ts planDays and
-- cardLine; src/lib/today-widget.ts): each Item placed from its first to its
-- last day, in the person's timezone; on a day, all-day and untimed first,
-- then by time, Meals by slot, then by position, when made and id; only
-- the Types they show on Plan (PLN-004), and only what they can read.
create function core.device_plan(p_device uuid, p_secret text)
returns table (day date, cards jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := core_private.device_person(p_device, p_secret);
  tz text;
  hidden text[];
  today date;
begin
  if me is null then
    raise exception 'Not a device' using errcode = '42501';
  end if;
  select coalesce(p.timezone, 'Europe/London'), p.plan_hidden_types into tz, hidden
  from core.people p where p.id = me;
  today := (now() at time zone tz)::date;
  return query
  with candidates as (
    select i.*, t.colour as type_colour
    from core.items i
    join core.item_types t on t.key = i.type and t.schedulable
    where i.archived_at is null
      and i.status not in ('cancelled', 'idea')
      and not (i.type = any (coalesce(hidden, '{}')))
      and (
        coalesce(i.do_on, i.due_on) between today and today + 1
        or (i.starts_at < (today + 3)::timestamp at time zone 'UTC'
            and coalesce(i.ends_at, i.starts_at) >= (today - 1)::timestamp at time zone 'UTC')
      )
      and core_private.readable_by(me, i.id)
  ),
  placed as (
    select c.*,
      case
        when c.starts_at is not null and c.all_day then (c.starts_at at time zone 'UTC')::date
        when c.starts_at is not null then (c.starts_at at time zone tz)::date
        else coalesce(c.do_on, c.due_on)
      end as first_day,
      case
        when c.starts_at is not null and c.all_day then
          greatest((coalesce(c.ends_at, c.starts_at + interval '1 day') at time zone 'UTC')::date - 1,
                   (c.starts_at at time zone 'UTC')::date)
        when c.starts_at is not null then
          greatest(((coalesce(c.ends_at, c.starts_at) - interval '1 millisecond') at time zone tz)::date,
                   (c.starts_at at time zone tz)::date)
        else coalesce(c.do_on, c.due_on)
      end as last_day,
      -- Its time on the clock; empty when all day or untimed.
      case
        when c.starts_at is not null and c.all_day then ''
        when c.starts_at is not null then to_char(c.starts_at at time zone tz, 'HH24:MI')
        when c.do_on is not null and c.do_at is not null then to_char(c.do_at, 'HH24:MI')
        else ''
      end as clock,
      -- The Event's own last day, as it ends (an all-day one's is exclusive).
      case
        when c.starts_at is not null and c.all_day then
          (coalesce(c.ends_at, c.starts_at + interval '1 day') at time zone 'UTC')::date - 1
        when c.starts_at is not null then (coalesce(c.ends_at, c.starts_at) at time zone tz)::date
      end as end_day
    from candidates c
  ),
  days as (
    select g::date as d from generate_series(today, today + 1, interval '1 day') g
  ),
  on_days as (
    select d.d, p.*,
      case when p.first_day < d.d then '' else p.clock end as at
    from days d
    join placed p on p.first_day <= d.d and p.last_day >= d.d
  )
  select d.d,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
          'id', o.id,
          'type', o.type,
          'colour', o.type_colour,
          'title', coalesce(
            nullif(btrim(o.title), ''),
            (select nullif(btrim(l), '') from unnest(string_to_array(coalesce(o.body, ''), E'\n')) l
             where btrim(l) <> '' limit 1),
            'Untitled'),
          'time', case
            when o.starts_at is not null then
              case
                when o.all_day or (o.first_day < d.d and (o.last_day > d.d or o.end_day > d.d)) then 'All day'
                when o.first_day < d.d then 'Until ' || to_char(o.ends_at at time zone tz, 'HH24:MI')
                else o.clock
              end
            when o.slot is not null then initcap(o.slot)
            when o.do_on is not null and o.do_at is not null then to_char(o.do_at, 'HH24:MI')
          end,
          'done', o.status = 'done',
          'ends', o.ends_at)
        order by o.at collate "C",
          case o.slot when 'breakfast' then 1 when 'lunch' then 2 when 'dinner' then 3 else 0 end,
          coalesce(o.position, '') collate "C", o.created_at, o.id)
       from on_days o where o.d = d.d),
      '[]'::jsonb)
  from days d
  order by d.d;
end
$$;
revoke execute on function core.device_plan(uuid, text) from public, anon, authenticated;
grant execute on function core.device_plan(uuid, text) to service_role;

-- Whether an Item's dates touch the days a widget may show (yesterday to
-- the day after tomorrow, wide enough for any timezone).
create function core_private.near_today(p_do_on date, p_due_on date, p_starts timestamptz, p_ends timestamptz)
returns boolean
language sql stable set search_path = '' as $$
  select coalesce(p_do_on, p_due_on) between current_date - 1 and current_date + 2
    or (p_starts < now() + interval '3 days' and coalesce(p_ends, p_starts) > now() - interval '2 days')
$$;

-- A change to what's on today or tomorrow tells the Android apps of
-- everyone who can read it to look again (ADR-0064), sharing the mark the
-- Reminders use, so a busy minute sends one message.
create function core_private.want_look_plan()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices d set look_wanted_at = now()
  where d.kind = 'fcm' and d.secret_hash is not null and d.enabled and d.gone_at is null
    and d.look_wanted_at is null
    and exists (
      select 1 from (
        select id, do_on, due_on, starts_at, ends_at from new_rows
        union all
        select id, do_on, due_on, starts_at, ends_at from old_rows
      ) c
      where core_private.near_today(c.do_on, c.due_on, c.starts_at, c.ends_at)
        and core_private.readable_by(d.person_id, c.id)
    );
  return null;
end
$$;
create function core_private.want_look_plan_inserted()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices d set look_wanted_at = now()
  where d.kind = 'fcm' and d.secret_hash is not null and d.enabled and d.gone_at is null
    and d.look_wanted_at is null
    and exists (
      select 1 from new_rows c
      where core_private.near_today(c.do_on, c.due_on, c.starts_at, c.ends_at)
        and core_private.readable_by(d.person_id, c.id)
    );
  return null;
end
$$;
-- Gone, it can't be read any more: everyone it was near today for looks.
create function core_private.want_look_plan_deleted()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices d set look_wanted_at = now()
  where d.kind = 'fcm' and d.secret_hash is not null and d.enabled and d.gone_at is null
    and d.look_wanted_at is null
    and exists (
      select 1 from old_rows c
      where core_private.near_today(c.do_on, c.due_on, c.starts_at, c.ends_at)
    );
  return null;
end
$$;
create trigger items_look_plan after update on core.items
  referencing new table as new_rows old table as old_rows
  for each statement execute function core_private.want_look_plan();
create trigger items_look_plan_inserted after insert on core.items
  referencing new table as new_rows
  for each statement execute function core_private.want_look_plan_inserted();
create trigger items_look_plan_deleted after delete on core.items
  referencing old table as old_rows
  for each statement execute function core_private.want_look_plan_deleted();

-- The Types shown on Plan, or the home timezone, changed on another device.
create function core_private.want_look_person()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.push_devices d set look_wanted_at = now()
  where d.kind = 'fcm' and d.secret_hash is not null and d.enabled and d.gone_at is null
    and d.look_wanted_at is null
    and d.person_id in (
      select n.id from new_rows n join old_rows o on o.id = n.id
      where n.plan_hidden_types is distinct from o.plan_hidden_types
         or n.timezone is distinct from o.timezone
    );
  return null;
end
$$;
create trigger people_look after update on core.people
  referencing new table as new_rows old table as old_rows
  for each statement execute function core_private.want_look_person();

revoke execute on function core_private.near_today(date, date, timestamptz, timestamptz),
  core_private.want_look_plan(), core_private.want_look_plan_inserted(),
  core_private.want_look_plan_deleted(), core_private.want_look_person()
  from public, anon, authenticated;
