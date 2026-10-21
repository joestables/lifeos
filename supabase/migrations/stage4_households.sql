-- Stage 4 (plan step 8a): Households (ADR-0039, ADR-0016, ADR-0051;
-- HSH-001–004). Anyone can create a Household and owns it; the owner
-- invites people by their Google email, and sharing starts when one joins.
-- Leaving makes the shared Items I created Personal, and a Variation whose
-- author no longer shares a Household with its Recipe's author moves to a
-- copy of the Recipe's heading of their own. Nothing here drops anything.

-- ---------------------------------------------------------------------------
-- Roles and invitations.

alter table core.space_members
  add column role text not null default 'member' check (role in ('owner', 'member'));
update core.space_members m set role = 'owner'
from core.spaces s where s.id = m.space_id and s.created_by = m.person_id;

-- An invitation to a Household, by email; it reads the same whether or not
-- the address has an account, and waits for it to sign in (ADR-0039).
create table core.space_invites (
  id uuid primary key default core_private.uuidv7(),
  space_id uuid not null references core.spaces (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  invited_by uuid not null references core.people (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (space_id, email)
);
create index space_invites_email on core.space_invites (email);
create index space_invites_invited_by on core.space_invites (invited_by);

-- ---------------------------------------------------------------------------
-- Who I may see: the people of my Spaces, by name.

create function core_private.my_space_peer_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct m.person_id from core.space_members m
  where m.space_id in (select core_private.my_space_ids())
$$;

create function core_private.my_email() returns text
language sql stable set search_path = '' as $$
  select lower(btrim(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', '')))
$$;

create function core_private.owns(p_space uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.space_members m
    join core.spaces s on s.id = m.space_id and s.kind = 'household'
    where m.space_id = p_space and m.person_id = (select auth.uid()) and m.role = 'owner'
  )
$$;

create policy "I read the people of my Spaces" on core.people
  for select to authenticated using (id in (select core_private.my_space_peer_ids()));

alter table core.space_invites enable row level security;
grant select on core.space_invites to authenticated;
create policy "An owner reads their Households' invitations" on core.space_invites
  for select to authenticated using (core_private.owns(space_id));

-- ---------------------------------------------------------------------------
-- Making and keeping Households (HSH-001).

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

create or replace function core.rename_household(p_id uuid, p_name text)
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

-- ---------------------------------------------------------------------------
-- Invitations (HSH-002).

create or replace function core.invite(p_id uuid, p_space uuid, p_email text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not core_private.owns(p_space) then
    raise exception 'Only a Household''s owner invites' using errcode = '42501';
  end if;
  insert into core.space_invites (id, space_id, email, invited_by)
  values (p_id, p_space, lower(btrim(p_email)), (select auth.uid()))
  on conflict do nothing;
end
$$;

create or replace function core.withdraw_invite(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from core.space_invites i where i.id = p_id and core_private.owns(i.space_id);
end
$$;

-- The invitations waiting for me: the Household's name and who sent it.
create or replace function core.my_invites()
returns table (id uuid, space_id uuid, space_name text, from_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.space_id, s.name, p.name, i.created_at
  from core.space_invites i
  join core.spaces s on s.id = i.space_id
  join core.people p on p.id = i.invited_by
  where i.email = core_private.my_email() and core_private.my_email() <> ''
  order by i.created_at
$$;

create or replace function core.join_household(p_invite uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  inv core.space_invites;
begin
  select * into inv from core.space_invites
  where id = p_invite and email = core_private.my_email() and core_private.my_email() <> '';
  if inv.id is null then
    raise exception 'No invitation % for you', p_invite using errcode = 'P0002';
  end if;
  insert into core.space_members (space_id, person_id, role)
  values (inv.space_id, (select auth.uid()), 'member')
  on conflict do nothing;
  delete from core.space_invites where id = inv.id;
end
$$;

create or replace function core.decline_invite(p_invite uuid)
returns void
language sql security definer set search_path = '' as $$
  delete from core.space_invites
  where id = p_invite and email = core_private.my_email() and core_private.my_email() <> ''
$$;

-- ---------------------------------------------------------------------------
-- Leaving (HSH-004; ADR-0016, ADR-0051).

-- A Recipe's name check stands aside while the database itself makes a
-- copy (`lifeos.food_deriving`), as the other food rules do.
create or replace function food_private.check_recipe_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  if food_private.deriving() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.type = 'recipe' and old.title = new.title then
    return new;
  end if;
  if btrim(new.title) = '' then
    raise exception 'A Recipe needs a name' using errcode = '23514';
  end if;
  if (select auth.uid()) is not null and exists (
    select 1 from core.items i
    where i.type = 'recipe' and i.id <> new.id and i.archived_at is null
      and food_private.name_key(i.title) = food_private.name_key(new.title)
      and i.id in (select core_private.readable_item_ids())
  ) then
    raise exception 'There''s already a Recipe called "%"', btrim(new.title) using errcode = '23505';
  end if;
  return new;
end
$$;

-- Whether two people share a Household.
create function core_private.peers(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.space_members a
    join core.space_members b on b.space_id = a.space_id
    join core.spaces s on s.id = a.space_id and s.kind = 'household'
    where a.person_id = p_a and b.person_id = p_b
  )
$$;

-- Each Variation whose author no longer shares a Household with its
-- Recipe's author goes, with the author's others of that Recipe, to a copy
-- of the Recipe's heading in the author's own Recipes; never merged back
-- (ADR-0051, HSH-004 1, 4). The copy has no photo.
create function food_private.split_variations() returns void
language plpgsql security definer set search_path = '' as $$
declare
  g record;
  copy_id uuid;
begin
  for g in
    select v.owner_id as author, r.id as recipe, r.title, r.status, array_agg(v.id order by v.created_at) as vs
    from core.items v
    join core.links l on l.from_item = v.id and l.link_type = 'variation_of'
    join core.items r on r.id = l.to_item
    where v.type = 'variation' and v.owner_id <> r.owner_id
      and not core_private.peers(v.owner_id, r.owner_id)
    group by v.owner_id, r.id, r.title, r.status
  loop
    copy_id := core_private.uuidv7();
    perform set_config('lifeos.food_deriving', 'on', true);
    insert into core.items (id, type, title, space_id, owner_id, status)
    values (
      copy_id, 'recipe', g.title,
      (select s.id from core.spaces s where s.created_by = g.author and s.kind = 'personal'),
      g.author, g.status
    );
    update food.recipe c set
      category = o.category, cuisine = o.cuisine, tags = o.tags, protein = o.protein,
      carbs = o.carbs, default_variation = g.vs[1]
    from food.recipe o where o.item_id = g.recipe and c.item_id = copy_id;
    -- Relinked, so each Recipe's state is worked out again and logged.
    delete from core.links where link_type = 'variation_of' and from_item = any (g.vs);
    insert into core.links (from_item, to_item, link_type, origin, created_by)
    select v, copy_id, 'variation_of', 'action', g.author from unnest(g.vs) v;
    -- The Recipe left behind opens on one of its own.
    update food.recipe set default_variation = (
      select l.from_item from core.links l join core.items v on v.id = l.from_item
      where l.to_item = g.recipe and l.link_type = 'variation_of'
      order by v.created_at limit 1
    ) where item_id = g.recipe and default_variation = any (g.vs);
  end loop;
  perform set_config('lifeos.food_deriving', '', true);
end
$$;

-- Someone parts from a Household: the shared Items they created become
-- Personal to them, they stop seeing the rest, and Variations split.
create function core_private.part(p_space uuid, p_person uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update core.items set space_id = (
    select s.id from core.spaces s where s.created_by = p_person and s.kind = 'personal'
  )
  where space_id = p_space and owner_id = p_person;
  delete from core.space_members where space_id = p_space and person_id = p_person;
  perform food_private.split_variations();
end
$$;

create or replace function core.leave_household(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from core.space_members m join core.spaces s on s.id = m.space_id and s.kind = 'household'
    where m.space_id = p_id and m.person_id = (select auth.uid())
  ) then
    raise exception 'No Household % of yours', p_id using errcode = 'P0002';
  end if;
  if core_private.owns(p_id) then
    raise exception 'An owner can''t leave a Household, only delete it' using errcode = '23514';
  end if;
  perform core_private.part(p_id, (select auth.uid()));
end
$$;

create or replace function core.remove_member(p_space uuid, p_person uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not core_private.owns(p_space) then
    raise exception 'Only a Household''s owner removes people' using errcode = '42501';
  end if;
  if p_person = (select auth.uid()) then
    raise exception 'An owner can''t leave a Household, only delete it' using errcode = '23514';
  end if;
  perform core_private.part(p_space, p_person);
end
$$;

-- Deleted for everyone, as if all had left; then it goes (HSH-004 3).
create or replace function core.delete_household(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  who uuid;
begin
  if not core_private.owns(p_id) then
    raise exception 'Only a Household''s owner deletes it' using errcode = '42501';
  end if;
  for who in select person_id from core.space_members where space_id = p_id loop
    perform core_private.part(p_id, who);
  end loop;
  delete from core.spaces where id = p_id;
end
$$;

revoke execute on function core.create_household(uuid, text), core.rename_household(uuid, text),
  core.invite(uuid, uuid, text), core.withdraw_invite(uuid), core.my_invites(),
  core.join_household(uuid), core.decline_invite(uuid), core.leave_household(uuid),
  core.remove_member(uuid, uuid), core.delete_household(uuid) from public, anon;
grant execute on function core.create_household(uuid, text), core.rename_household(uuid, text),
  core.invite(uuid, uuid, text), core.withdraw_invite(uuid), core.my_invites(),
  core.join_household(uuid), core.decline_invite(uuid), core.leave_household(uuid),
  core.remove_member(uuid, uuid), core.delete_household(uuid) to authenticated;
grant execute on function core_private.my_space_peer_ids(), core_private.my_email(),
  core_private.owns(uuid), core_private.peers(uuid, uuid) to authenticated;
