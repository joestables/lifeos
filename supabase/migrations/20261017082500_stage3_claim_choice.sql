-- Stage 3 (Joe and the bug hunt, 17 October): calendar-push's jobs, as
-- stage3_push_claim, and (GCL-005, ADR-0048):
-- - a new Event goes to the calendar chosen for it, or nowhere when none was;
-- - a repeat made from an Event already in Google goes to that calendar,
--   and each occurrence carries its Google event, so the single one it was
--   can be taken out;
-- - a claimed job waits at least five minutes before it is claimed again,
--   and a broken connection's jobs wait a quarter of an hour.

create or replace function core.calendar_outbox_claim(p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o core_private.calendar_outbox;
  i core.items;
  s core.series;
  r core.external_refs;
  sr core_private.series_refs;
  l core.calendar_links;
  c core.connections;
  jobs jsonb := '[]';
  tz text;
begin
  for o in
    select * from core_private.calendar_outbox
    where sent_at is null and next_try_at <= now()
    order by queued_at limit p_limit
    for update skip locked
  loop
    l := null; r := null; sr := null;
    select coalesce(p.timezone, 'Europe/London') into tz from core.people p where p.id = o.person_id;
    if o.item_id is not null then
      select * into i from core.items where id = o.item_id;
      select * into r from core.external_refs where item_id = o.item_id;
      if r.item_id is not null then
        select * into l from core.calendar_links where id = r.calendar_link_id;
      elsif i.archived_at is null and i.type = 'event' and i.series_id is null then
        select * into l from core.calendar_links
        where id = core_private.new_event_calendar(o.person_id, array[o.item_id]);
      end if;
    else
      select * into s from core.series where id = o.series_id;
      select * into sr from core_private.series_refs where series_id = o.series_id;
      if sr.series_id is not null then
        select * into l from core.calendar_links where id = sr.calendar_link_id;
      else
        select * into l from core.calendar_links
        where id = coalesce(
          (select r2.calendar_link_id from core.external_refs r2
           join core.items x on x.id = r2.item_id
           where x.series_id = o.series_id and r2.calendar_link_id is not null
           order by x.occurrence_on limit 1),
          core_private.new_event_calendar(o.person_id,
            array(select x.id from core.items x where x.series_id = o.series_id)));
      end if;
    end if;

    if l.id is null or l.level <> 'two_way' then
      update core_private.calendar_outbox set sent_at = now(), error = 'nowhere to go' where id = o.id;
      continue;
    end if;
    select * into c from core.connections where id = l.connection_id;
    if c.state <> 'connected' or c.disconnected_at is not null then
      update core_private.calendar_outbox set next_try_at = now() + interval '15 minutes'
      where id = o.id;
      continue;
    end if;

    update core_private.calendar_outbox
    set attempts = attempts + 1,
        next_try_at = now() + least(interval '6 hours', interval '5 minutes' * power(2, attempts))
    where id = o.id;

    jobs := jobs || jsonb_build_object(
      'outbox', o.id,
      'queued_at', o.queued_at,
      'connection', c.id,
      'link', l.id,
      'calendar_id', l.calendar_id,
      'timezone', tz,
      'item', case when o.item_id is not null then jsonb_build_object(
        'id', i.id, 'type', i.type, 'title', i.title, 'body', i.body, 'place', i.place,
        'starts_at', i.starts_at, 'ends_at', i.ends_at, 'all_day', i.all_day,
        'archived', i.archived_at is not null,
        'external_id', r.external_id, 'etag', r.etag) end,
      'series', case when o.series_id is not null then jsonb_build_object(
        'id', s.id, 'rule', s.rule, 'ended_on', s.ended_on, 'template', s.template,
        'external_id', sr.external_id, 'etag', sr.etag,
        'occurrences', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', x.id, 'on', x.occurrence_on, 'starts_at', x.starts_at, 'ends_at', x.ends_at,
            'all_day', x.all_day, 'archived', x.archived_at is not null, 'touched', x.touched_at is not null,
            'external_id', xr.external_id
          ) order by x.occurrence_on), '[]')
          from core.items x left join core.external_refs xr on xr.item_id = x.id
          where x.series_id = s.id)) end
    );
  end loop;
  return jobs;
end
$$;

