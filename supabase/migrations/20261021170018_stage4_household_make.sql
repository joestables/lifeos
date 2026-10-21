-- Stage 4 (plan step 8a): making and renaming Households (HSH-001).

create function core.create_household(p_id uuid, p_name text)
returns core.spaces
language plpgsql security definer set search_path = '' as $$
declare
  r core.spaces;
  me uuid := (select auth.uid());
  first boolean;
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if exists (select 1 from core.spaces where id = p_id) then
    select * into r from core.spaces where id = p_id and id in (select core_private.my_space_ids());
    return r;
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'A Household needs a name' using errcode = '23514';
  end if;
  first := not exists (
    select 1 from core.space_members m join core.spaces s on s.id = m.space_id
    where m.person_id = me and s.kind = 'household'
  );
  insert into core.spaces (id, kind, name, created_by) values (p_id, 'household', btrim(p_name), me)
  returning * into r;
  insert into core.space_members (space_id, person_id, role) values (p_id, me, 'owner');
  -- My first Household starts with a copy of my staples (PAN-002 1).
  if first then
    insert into food.staples (space_id, pantry_id, out_of_stock)
    select p_id, st.pantry_id, st.out_of_stock
    from food.staples st join core.spaces s on s.id = st.space_id
    where s.kind = 'personal' and s.created_by = me;
  end if;
  return r;
end
$$;

create function core.rename_household(p_id uuid, p_name text)
returns core.spaces
language plpgsql security definer set search_path = '' as $$
declare
  r core.spaces;
begin
  if not core_private.owns(p_id) then
    raise exception 'Only a Household''s owner renames it' using errcode = '42501';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'A Household needs a name' using errcode = '23514';
  end if;
  update core.spaces set name = btrim(p_name) where id = p_id returning * into r;
  return r;
end
$$;

revoke execute on function core.create_household(uuid, text), core.rename_household(uuid, text) from public, anon;
grant execute on function core.create_household(uuid, text), core.rename_household(uuid, text) to authenticated;
