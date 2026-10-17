-- Stage 3 (plan step 4): Plan's read (ADR-0049).

-- ---------------------------------------------------------------------------
-- Plan's read (ADR-0049, PLN-001): the Schedulable Items on any day in the
-- range, in my home timezone, as the caller sees them. Each comes with the
-- first and last day it is on Plan, whether it repeats, and for an Event
-- from Google its calendar and whether it can be changed here.

create function core.plan_items(p_from date, p_to date)
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
      )
  ),
  placed as (
    select c.it,
      case
        when (c.it).starts_at is not null and (c.it).all_day then ((c.it).starts_at at time zone 'UTC')::date
        when (c.it).starts_at is not null then ((c.it).starts_at at time zone me.tz)::date
        else coalesce((c.it).do_on, (c.it).due_on)
      end as first_day,
      case
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

revoke execute on function core.plan_items(date, date) from public;
grant execute on function core.plan_items(date, date) to authenticated;
