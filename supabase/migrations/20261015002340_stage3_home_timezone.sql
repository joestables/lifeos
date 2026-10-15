-- Stage 3 (plan step 4): a person's home timezone (ADR-0021), for writes
-- that work in it (Task <-> Event, in stage3_convert).

create function core_private.home_timezone(p_person uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.timezone from core.people p where p.id = p_person), 'Europe/London')
$$;
grant execute on function core_private.home_timezone(uuid) to authenticated, service_role;
