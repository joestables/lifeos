-- Stage 3 (bug hunt, 17 October): a repeating event changed in Google (its
-- rule, "this and following", or no longer repeating) drops instances, and
-- Google doesn't say so. After reading a repeating event's instances,
-- calendar-sync names the ones it has; the others LifeOS brought in, in
-- the window read, go to Recently deleted (GCL-003 2, 3; ADR-0047). Only
-- events Google made: a repeat made in LifeOS keeps its occurrences.
create function core.calendar_prune(p_link uuid, p_masters jsonb, p_from timestamptz,
                                    p_until timestamptz)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  n int;
  pruned int := 0;
begin
  perform set_config('lifeos.importing', 'on', true);
  for m in select * from jsonb_array_elements(p_masters) loop
    update core.items i set archived_at = now()
    from core.external_refs r
    where r.item_id = i.id and r.calendar_link_id = p_link and not r.made_in_lifeos
      and i.type = 'event' and i.archived_at is null
      and r.raw ->> 'recurringEventId' = m ->> 'master'
      and i.starts_at >= p_from and i.starts_at < p_until
      and not (r.external_id = any (array(select jsonb_array_elements_text(m -> 'keep'))))
      and not core_private.calendar_waiting(i.id, r.external_updated);
    get diagnostics n = row_count;
    pruned := pruned + n;
  end loop;
  perform set_config('lifeos.importing', '', true);
  return pruned;
end
$$;

revoke execute on function core.calendar_prune(uuid, jsonb, timestamptz, timestamptz) from public;
grant execute on function core.calendar_prune(uuid, jsonb, timestamptz, timestamptz) to service_role;
