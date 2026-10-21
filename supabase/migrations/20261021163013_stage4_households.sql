-- Stage 4 (plan step 8a): Households (ADR-0039, ADR-0016, ADR-0051;
-- HSH-001–004): roles, invitations and who I may see. Their write
-- functions follow in stage4_household_writes.

alter table core.space_members
  add column role text not null default 'member' check (role in ('owner', 'member'));
-- Whoever made a Space owns it.
do $$
begin
  update core.space_members m set role = 'owner'
  from core.spaces s where s.id = m.space_id and s.created_by = m.person_id;
end
$$;

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

create policy "I read the people of my Spaces" on core.people
  for select to authenticated using (id in (select core_private.my_space_peer_ids()));

alter table core.space_invites enable row level security;
grant select on core.space_invites to authenticated;
create policy "An owner reads their Households' invitations" on core.space_invites
  for select to authenticated using (core_private.owns(space_id));

grant execute on function core_private.my_space_peer_ids(), core_private.my_email(),
  core_private.owns(uuid), core_private.peers(uuid, uuid) to authenticated;
