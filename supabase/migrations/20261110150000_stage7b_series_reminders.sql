-- Stage 7b, step 6: the nightly series run closes an untouched occurrence
-- overtaken by a newer one as cancelled (TSK-010) only where its Type has
-- that status. A Reminder's only status is active (ADR-0065 1): its past
-- occurrences stay on their days, and closing one would fail the whole run.
create or replace function core.finish_series_run(p_ok boolean, p_details jsonb default '{}')
returns int
language plpgsql security definer set search_path = '' as $$
declare
  skipped int;
begin
  perform set_config('lifeos.series_writing', 'on', true);
  update core.items i set status = 'cancelled'
  from core.series s, core.item_types t
  where i.series_id = s.id and i.touched_at is null and i.archived_at is null
    and t.key = i.type and 'cancelled' = any (t.statuses)
    and i.status in ('active', 'idea')
    and exists (
      select 1 from core.items n
      where n.series_id = i.series_id and n.archived_at is null
        and n.occurrence_on > i.occurrence_on
        and n.do_on <= (now() at time zone s.timezone)::date
    );
  get diagnostics skipped = row_count;
  perform set_config('lifeos.series_writing', '', true);

  insert into ops.heartbeats (name, at, ok, details)
  values ('extend-series', now(), p_ok, p_details || jsonb_build_object('skipped', skipped))
  on conflict (name) do update set at = excluded.at, ok = excluded.ok, details = excluded.details;
  if not p_ok then
    insert into ops.events (source, kind, message, details)
    values ('edge', 'series_failed', 'The nightly series run failed', p_details);
  end if;
  return skipped;
end
$$;
