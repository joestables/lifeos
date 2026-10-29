-- Stage 4b (plan step 5): staples done as ADR-0057 decided, now the Pantry's
-- staple marks are going (Joe, 24 October: built the correct way, the
-- Pantry's staples out of action until Shopping takes over). food.staples
-- becomes food.space_entries: each Space's staples and Essentials, needed
-- meaning out of stock for a staple and Required for an Essential (SHP-005).
-- Taking one off, and merges, follow in stage4b_space_entries_removing.

alter table food.staples rename to space_entries;
alter table food.space_entries rename column out_of_stock to needed;
alter table food.space_entries rename constraint staples_pkey to space_entries_pkey;
alter table food.space_entries rename constraint staples_space_id_fkey to space_entries_space_id_fkey;
alter table food.space_entries rename constraint staples_pantry_id_fkey to space_entries_pantry_id_fkey;
alter table food.space_entries rename constraint staples_kind_check to space_entries_kind_check;
alter index food.staples_pantry rename to space_entries_pantry;

alter policy "I read my Spaces' staples" on food.space_entries
  rename to "I read my Spaces' staples and Essentials";
alter policy "I mark my Spaces' staples" on food.space_entries
  rename to "I keep my Spaces' staples and Essentials";
alter policy "I change my Spaces' staples" on food.space_entries
  rename to "I change my Spaces' staples and Essentials";
alter policy "I unmark my Spaces' staples" on food.space_entries
  rename to "I take off my Spaces' staples and Essentials";

-- One of a Space's staples or Essentials kept, made the other kind, or
-- marked needed (SHP-005 1, 2).
create or replace function food.keep_entry(p_space uuid, p_pantry uuid, p_kind text, p_needed boolean default false)
returns food.space_entries
language plpgsql set search_path = '' as $$
declare
  r food.space_entries;
begin
  insert into food.space_entries (space_id, pantry_id, kind, needed)
  values (p_space, p_pantry, p_kind, coalesce(p_needed, false))
  on conflict (space_id, pantry_id) do update
    set kind = excluded.kind, needed = excluded.needed;
  select * into r from food.space_entries where space_id = p_space and pantry_id = p_pantry;
  return r;
end
$$;

-- Ticking (SHP-001 4) clears needed where the line came from, else in the
-- shop's own Space (SHP-003 4).
create or replace function shopping.tick(p_ids uuid[], p_checked boolean)
returns void
language plpgsql set search_path = '' as $$
begin
  update shopping.lines set checked = p_checked
  where id = any (p_ids) and heading is null and checked is distinct from p_checked;
  if p_checked then
    update food.space_entries e set needed = false
    from shopping.lines l join core.items i on i.id = l.list_id
    where l.id = any (p_ids) and l.pantry_id is not null
      and e.pantry_id = l.pantry_id and e.needed
      and e.space_id = coalesce(l.needed_space_id, i.space_id);
  end if;
end
$$;

-- My first Household starts with a copy of my staples and Essentials
-- (SHP-005 4).
create or replace function core.create_household(p_id uuid, p_name text)
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
  if first then
    insert into food.space_entries (space_id, pantry_id, kind, needed)
    select p_id, e.pantry_id, e.kind, e.needed
    from food.space_entries e join core.spaces s on s.id = e.space_id
    where s.kind = 'personal' and s.created_by = me;
  end if;
  return r;
end
$$;
