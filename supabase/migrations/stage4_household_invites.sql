-- Stage 4 (plan step 8a): invitations to a Household, by Google email
-- (HSH-002, ADR-0039).

create function core.invite(p_id uuid, p_space uuid, p_email text)
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

create function core.withdraw_invite(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from core.space_invites i where i.id = p_id and core_private.owns(i.space_id);
end
$$;

-- The invitations waiting for me: the Household's name and who sent it.
create function core.my_invites()
returns table (id uuid, space_id uuid, space_name text, from_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.space_id, s.name, p.name, i.created_at
  from core.space_invites i
  join core.spaces s on s.id = i.space_id
  join core.people p on p.id = i.invited_by
  where i.email = core_private.my_email() and core_private.my_email() <> ''
  order by i.created_at
$$;

create function core.join_household(p_invite uuid)
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

create function core.decline_invite(p_invite uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from core.space_invites
  where id = p_invite and email = core_private.my_email() and core_private.my_email() <> '';
end
$$;

revoke execute on function core.invite(uuid, uuid, text), core.withdraw_invite(uuid), core.my_invites(),
  core.join_household(uuid), core.decline_invite(uuid) from public, anon;
grant execute on function core.invite(uuid, uuid, text), core.withdraw_invite(uuid), core.my_invites(),
  core.join_household(uuid), core.decline_invite(uuid) to authenticated;
