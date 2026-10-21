-- Stage 4 (plan step 5), from the production bug hunt (20 October).
--
-- 1. A copied Variation's lines and steps take ids the app chose
--    (p_ids: {source id: new id}), so edits made before the copy is sent
--    reach the right rows (RCP-009, RCP-016 1). Without p_ids, new ids.
-- 2. A change's note is written only through food.note_change, which checks
--    who made the change; direct writes could hold another person's change.

-- The old signature leaves the API (food_private isn't exposed) rather
-- than being dropped: a drop waits on a confirmation no one sees.
alter function food.add_variation(uuid, uuid, text, uuid) set schema food_private;
revoke execute on function food_private.add_variation(uuid, uuid, text, uuid) from public, anon, authenticated;
create function food.add_variation(p_id uuid, p_recipe uuid, p_name text, p_from uuid default null,
  p_ids jsonb default null)
returns core.items
language plpgsql security definer set search_path = '' as $$
declare
  r core.items;
  me uuid := (select auth.uid());
  space uuid := food_private.personal_space();
begin
  if exists (select 1 from core.items where id = p_id) then
    select * into r from core.items where id = p_id and core_private.can_read(id);
    return r;
  end if;
  if me is null or space is null
    or (select type from core.items where id = p_recipe) is distinct from 'recipe'
    or not core_private.can_read(p_recipe)
  then
    raise exception 'No Recipe % to add a Variation to', p_recipe using errcode = 'P0002';
  end if;
  if p_from is not null and (food_private.recipe_of(p_from) is distinct from p_recipe or not core_private.can_read(p_from)) then
    raise exception 'A Variation is copied from one of the same Recipe' using errcode = '23514';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'A Variation needs a name' using errcode = '23514';
  end if;
  if p_ids is not null and jsonb_typeof(p_ids) <> 'object' then
    raise exception 'p_ids maps a copied row''s id to its new one' using errcode = '22023';
  end if;

  insert into core.items (id, type, title, space_id, owner_id, status)
  values (p_id, 'variation', btrim(p_name), space, me, case when p_from is null then 'idea' else 'active' end);
  if p_from is not null then
    update food.variation t set servings = f.servings, prep_min = f.prep_min, cook_min = f.cook_min,
      sources = f.sources, notes = f.notes
    from food.variation f where f.item_id = p_from and t.item_id = p_id;
    insert into food.variation_lines (id, variation_id, position, heading, pantry_id, text, qty, qty_max, approx, unit)
    select coalesce((p_ids ->> id::text)::uuid, core_private.uuidv7()), p_id, position, heading, pantry_id,
      text, qty, qty_max, approx, unit
    from food.variation_lines where variation_id = p_from;
    insert into food.variation_steps (id, variation_id, position, text)
    select coalesce((p_ids ->> id::text)::uuid, core_private.uuidv7()), p_id, position, text
    from food.variation_steps where variation_id = p_from;
  end if;
  insert into core.links (from_item, to_item, link_type, origin, created_by)
  values (p_id, p_recipe, 'variation_of', 'action', me);
  select * into r from core.items where id = p_id;
  return r;
end
$$;
revoke execute on function food.add_variation(uuid, uuid, text, uuid, jsonb) from public, anon;
grant execute on function food.add_variation(uuid, uuid, text, uuid, jsonb) to authenticated;

-- Its write policies stay but no longer apply: nothing may write directly.
revoke insert, update, delete on food.change_notes from authenticated;

create or replace function food.note_change(p_activity bigint, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  a core.activity;
  me uuid := (select auth.uid());
begin
  select * into a from core.activity where id = p_activity;
  if a.id is null or not core_private.can_read(a.item_id) then
    raise exception 'No change % to note', p_activity using errcode = 'P0002';
  end if;
  if me is null or a.actor is distinct from me then
    raise exception 'Only who made a change notes it' using errcode = '42501';
  end if;
  if nullif(btrim(p_note), '') is null then
    delete from food.change_notes where activity_id = p_activity;
    return;
  end if;
  insert into food.change_notes (activity_id, item_id, note, person_id)
  values (p_activity, a.item_id, btrim(p_note), me)
  on conflict (activity_id) do update set note = excluded.note, updated_at = now();
end
$$;
