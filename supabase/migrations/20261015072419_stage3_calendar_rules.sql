-- Stage 3 (plan step 4): a calendar's sync level, where new Events go, and
-- Google's fields kept Google's (GCL-002, GCL-004).

-- A calendar's sync level and where new Events go (GCL-002). Turning a
-- calendar off takes its Events off Plan (archived as the sync left them);
-- turning it on again brings them back with the next sync.
create function core.set_calendar_level(p_link uuid, p_level text)
returns core.calendar_links
language plpgsql security definer set search_path = '' as $$
declare
  r core.calendar_links;
begin
  update core.calendar_links l set
    level = p_level,
    new_events = l.new_events and p_level = 'two_way'
  where l.id = p_link and l.person_id = (select auth.uid())
  returning * into r;
  if r.id is null then
    raise exception 'No calendar %', p_link using errcode = 'P0002';
  end if;
  if p_level = 'off' then
    perform set_config('lifeos.importing', 'on', true);
    update core.items i set archived_at = now()
    from core.external_refs e
    where e.item_id = i.id and e.calendar_link_id = p_link and i.archived_at is null;
    update core.calendar_links set sync_token = null, synced_until = null where id = p_link;
    perform set_config('lifeos.importing', '', true);
  end if;
  return r;
end
$$;

create function core.set_new_events_calendar(p_link uuid)
returns core.calendar_links
language plpgsql security definer set search_path = '' as $$
declare
  r core.calendar_links;
begin
  update core.calendar_links set new_events = false
  where person_id = (select auth.uid()) and new_events and id is distinct from p_link;
  if p_link is null then
    return null;
  end if;
  update core.calendar_links set new_events = true
  where id = p_link and person_id = (select auth.uid())
  returning * into r;
  if r.id is null then
    raise exception 'No calendar %', p_link using errcode = 'P0002';
  end if;
  return r;
end
$$;

-- An Event from Google stays Personal (GCL-003 5), and on a calendar that
-- isn't two-way, what Google holds is Google's (GCL-004): its title, times,
-- place, notes, repeat and whether it exists. Labels, Reminders and links
-- are LifeOS's own and live in other tables. The sync itself writes with
-- lifeos.importing on.
create function core_private.check_external() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lvl text;
begin
  if coalesce(current_setting('lifeos.importing', true), '') = 'on' then
    return new;
  end if;
  select coalesce(l.level, 'incoming') into lvl
  from core.external_refs e left join core.calendar_links l on l.id = e.calendar_link_id
  where e.item_id = new.id;
  if not found then
    return new;
  end if;
  if new.space_id <> old.space_id then
    raise exception 'An Event from Google Calendar stays Personal' using errcode = '42501';
  end if;
  if lvl <> 'two_way' and (
    (new.title, new.body, new.place, new.starts_at, new.ends_at, new.all_day, new.type,
     new.status, new.series_id)
      is distinct from
    (old.title, old.body, old.place, old.starts_at, old.ends_at, old.all_day, old.type,
     old.status, old.series_id)
    or (new.archived_at is null) <> (old.archived_at is null)
  ) then
    raise exception 'This Event is changed in Google Calendar' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger items_check_external before update on core.items
for each row execute function core_private.check_external();

revoke execute on function core_private.check_external() from public;
revoke execute on function core.set_calendar_level(uuid, text) from public;
revoke execute on function core.set_new_events_calendar(uuid) from public;
grant execute on function core.set_calendar_level(uuid, text) to authenticated;
grant execute on function core.set_new_events_calendar(uuid) to authenticated;
