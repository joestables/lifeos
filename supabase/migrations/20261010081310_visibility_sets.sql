-- The can_read benchmark (Stage 1, step 11) found reading every Item slow:
-- the one-hop check ran once per row. The policies now use the same rule as
-- sets, worked out once per query (ADR-0017).

-- Items one hop from a live Item in one of my Spaces (read-only).
create function core_private.linked_item_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select l.to_item
  from core.links l
  join core.items o on o.id = l.from_item
  where o.archived_at is null and o.space_id in (select core_private.my_space_ids())
  union
  select l.from_item
  from core.links l
  join core.items o on o.id = l.to_item
  where o.archived_at is null and o.space_id in (select core_private.my_space_ids())
$$;

-- Every Item I can read: those in my Spaces, and live ones one hop away.
create function core_private.readable_item_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select i.id from core.items i where i.space_id in (select core_private.my_space_ids())
  union
  select i.id from core.items i
  where i.archived_at is null and i.id in (select core_private.linked_item_ids())
$$;

grant execute on function core_private.linked_item_ids() to authenticated;
grant execute on function core_private.readable_item_ids() to authenticated;

alter policy "I read what I can see" on core.items
  using (
    space_id in (select core_private.my_space_ids())
    or (archived_at is null and id in (select core_private.linked_item_ids()))
  );

alter policy "I read links between Items I can see" on core.links
  using (
    from_item in (select core_private.readable_item_ids())
    and to_item in (select core_private.readable_item_ids())
  );

alter policy "I read the history of what I can see" on core.activity
  using (item_id in (select core_private.readable_item_ids()));
