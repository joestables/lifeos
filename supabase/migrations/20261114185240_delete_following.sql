-- Deleting a repeating Item: this one, or this and all following (Joe,
-- 14 November; ADR-0022, amended). "This one" is archive_item, as before.
-- "This and all following" ends the series the day before this occurrence
-- and archives this one and every later one, changed or not: unlike Repeat
-- None, which keeps the occurrences I've changed (end_series), Delete means
-- them gone. A Google-linked Event's series goes to Google as one change
-- (its rule ended, and the repeating event deleted when nothing of it is
-- left), never as a delete of each instance, which Google refuses once the
-- instance falls after the rule's new end.

create or replace function core.delete_following(p_item uuid)
returns core.items
language plpgsql set search_path = '' as $$
declare
  it core.items;
begin
  select * into it from core.items where id = p_item;
  if it.id is null then
    raise exception 'No Item % to delete', p_item using errcode = 'P0002';
  end if;
  if it.series_id is null or it.occurrence_on is null then
    update core.items set archived_at = now() where id = p_item and archived_at is null;
    return it;
  end if;
  perform core_private.end_series(it.series_id, it.occurrence_on - 1);
  perform set_config('lifeos.series_deleting', 'on', true);
  update core.items set archived_at = now()
  where series_id = it.series_id and occurrence_on >= it.occurrence_on and archived_at is null;
  perform set_config('lifeos.series_deleting', '', true);
  return it;
end
$$;

grant execute on function core.delete_following(uuid) to authenticated;

-- While a series is being deleted, an occurrence I'd changed goes to Google
-- with its series, not on its own.
create or replace function core_private.items_to_calendar()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  spaces uuid[] := array[new.space_id, case when tg_op = 'UPDATE' then old.space_id end];
begin
  if coalesce(current_setting('lifeos.importing', true), '') = 'on' then
    return null;
  end if;
  if new.type <> 'event' and (tg_op = 'INSERT' or old.type <> 'event') then
    return null;
  end if;
  if tg_op = 'UPDATE' and (new.title, new.body, new.place, new.starts_at, new.ends_at, new.all_day,
      new.archived_at, new.type, new.series_id, new.touched_at, new.space_id)
    is not distinct from (old.title, old.body, old.place, old.starts_at, old.ends_at, old.all_day,
      old.archived_at, old.type, old.series_id, old.touched_at, old.space_id) then
    return null;
  end if;
  if new.series_id is not null and new.type = 'event' and (new.touched_at is null
      or coalesce(current_setting('lifeos.series_deleting', true), '') = 'on') then
    perform core_private.calendar_queue(new.owner_id, null, new.series_id);
    perform core_private.queue_copies(null, new.series_id, spaces, array[new.owner_id]);
  else
    perform core_private.calendar_queue(new.owner_id, new.id, null);
    perform core_private.queue_copies(new.id, null, spaces, array[new.owner_id]);
  end if;
  return null;
end
$$;
