-- Stage 3 (Joe, 17 October): a new Event's calendar, chosen as it is made
-- (GCL-002 2, GCL-005 1; ADR-0048).

-- ---------------------------------------------------------------------------
-- The calendar I chose for a new Event: one of my two-way calendars, or
-- none, so it stays in LifeOS. The app writes it just before the Event, so
-- calendar-push never finds the Event without it; with no row, the Event
-- goes to my default calendar.
create table core_private.event_calendars (
  item_id uuid primary key,
  person_id uuid not null references core.people (id) on delete cascade,
  calendar_link_id uuid references core.calendar_links (id) on delete set null,
  chosen_at timestamptz not null default now()
);
create index event_calendars_person on core_private.event_calendars (person_id);
create index event_calendars_link on core_private.event_calendars (calendar_link_id);
alter table core_private.event_calendars enable row level security;

create function core.set_event_calendar(p_item uuid, p_link uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if p_link is not null and not exists (
    select 1 from core.calendar_links
    where id = p_link and person_id = me and level = 'two_way'
  ) then
    raise exception 'No two-way calendar %', p_link using errcode = 'P0002';
  end if;
  if exists (select 1 from core.items where id = p_item and owner_id <> me) then
    raise exception 'No item %', p_item using errcode = 'P0002';
  end if;
  insert into core_private.event_calendars (item_id, person_id, calendar_link_id)
  values (p_item, me, p_link)
  on conflict (item_id) do update
    set calendar_link_id = excluded.calendar_link_id, chosen_at = now()
    where core_private.event_calendars.person_id = me;
end
$$;

-- Where a new Event (or a new repeating Event, by any of its occurrences)
-- goes: the calendar chosen for it, which may be none; else my default.
create function core_private.new_event_calendar(p_person uuid, p_items uuid[])
returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  chosen uuid;
begin
  select e.calendar_link_id into chosen from core_private.event_calendars e
  where e.person_id = p_person and e.item_id = any (p_items)
  order by e.chosen_at desc limit 1;
  if found then
    return chosen;
  end if;
  return (select id from core.calendar_links where person_id = p_person and new_events);
end
$$;

revoke execute on function core.set_event_calendar(uuid, uuid) from public;
grant execute on function core.set_event_calendar(uuid, uuid) to authenticated;
revoke execute on function core_private.new_event_calendar(uuid, uuid[]) from public;
