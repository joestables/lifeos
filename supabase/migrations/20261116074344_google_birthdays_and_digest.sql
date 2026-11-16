-- From the production bug hunt of 15 November, as Joe chose (16 November).
--
-- 1. A Google birthday is Google's (GCL-004 3). Google refuses most changes
--    to one of its birthday events, so a change made here, on a two-way
--    calendar, was sent, refused (400) and tried again for ever. It is read
--    only now, whatever its calendar's level, as an incoming calendar's
--    Events are; its Alerts and Tasks stay mine.
-- 2. The morning digest is Today in one notification (REM-008 1): "today"
--    counts everything on Today that isn't done, of every Type, as the
--    widget lists it, not Tasks alone; with only a Reminder, an Event or a
--    Meal on the day, no digest came.

create or replace function core_private.check_external()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lvl text;
begin
  if coalesce(current_setting('lifeos.importing', true), '') = 'on' or old.type <> 'event' then
    return new;
  end if;
  select case when e.raw ->> 'eventType' = 'birthday' then 'birthday' else coalesce(l.level, 'incoming') end
  into lvl
  from core.external_refs e left join core.calendar_links l on l.id = e.calendar_link_id
  where e.item_id = new.id and not e.made_in_lifeos;
  if not found then
    return new;
  end if;
  if lvl <> 'two_way' and (
    (new.title, new.body, new.place, new.starts_at, new.ends_at, new.all_day, new.type,
     new.status, new.series_id, new.space_id)
      is distinct from
    (old.title, old.body, old.place, old.starts_at, old.ends_at, old.all_day, old.type,
     old.status, old.series_id, old.space_id)
    or (new.archived_at is null) <> (old.archived_at is null)
  ) then
    raise exception 'This Event is changed in Google Calendar' using errcode = '42501';
  end if;
  return new;
end
$$;

-- What the digest says: Today's cards (core_private.today_cards), an
-- overdue Task's saying "Overdue" where its time would be; a done one
-- isn't counted. No Thoughts (ALR-001 4): Today has none.
create or replace function core_private.day_counts(p_person uuid, p_today date)
returns table(overdue integer, today integer, to_sort integer)
language sql stable set search_path = '' as $$
  select
    count(*) filter (where c ->> 'time' = 'Overdue')::int,
    count(*) filter (where c ->> 'time' is distinct from 'Overdue' and not (c ->> 'done')::boolean)::int,
    0
  from jsonb_array_elements(core_private.today_cards(
    p_person,
    coalesce((select p.timezone from core.people p where p.id = p_person), 'Europe/London'),
    p_today)) c
$$;
