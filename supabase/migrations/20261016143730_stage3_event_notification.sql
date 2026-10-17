-- Stage 3 (plan step 5): an Event's notification (EVT-003).

-- ---------------------------------------------------------------------------
-- An Event's notification says its title, when it starts and where
-- (EVT-003 4), and offers Snooze only (an Event isn't done).

create or replace function core_private.notification_payload(d core.reminder_deliveries)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  i core.items;
  t core.item_types;
  tz text;
  c record;
  parts text[] := '{}';
  line text;
  buttons jsonb := '[]';
begin
  select timezone into tz from core.people where id = d.person_id;
  tz := coalesce(tz, 'Europe/London');
  if d.kind = 'digest' then
    select * into c from core_private.day_counts(d.person_id, (now() at time zone tz)::date);
    if c.overdue > 0 then parts := parts || (c.overdue || ' overdue'); end if;
    if c.today > 0 then parts := parts || (c.today || ' today'); end if;
    if c.to_sort > 0 then
      parts := parts || (c.to_sort || case when c.to_sort = 1 then ' thought' else ' thoughts' end);
    end if;
    if cardinality(parts) = 0 then
      return null;
    end if;
    return jsonb_build_object('title', array_to_string(parts, ' · '), 'body', '', 'url', '/inbox',
                              'tag', d.key, 'actions', '[]'::jsonb);
  end if;

  select * into i from core.items where id = d.item_id;
  if i.id is null or i.archived_at is not null or i.status not in ('active', 'idea') then
    return null;
  end if;
  select * into t from core.item_types where key = i.type;
  if i.starts_at is not null then
    line := case when i.all_day then to_char((i.starts_at at time zone 'UTC')::date, 'Dy FMDD Mon')
                 else to_char(i.starts_at at time zone tz, 'Dy FMDD Mon HH24:MI') end;
  end if;
  if i.place is not null and btrim(i.place) <> '' then
    line := concat_ws(' · ', line, btrim(i.place));
  end if;
  if i.do_at is not null and i.do_on is not null then
    line := to_char(i.do_on, 'Dy FMDD Mon') || ' ' || to_char(i.do_at, 'HH24:MI');
  end if;
  if i.due_on is not null then
    line := concat_ws(' · ', line, 'Due ' || to_char(i.due_on, 'Dy FMDD Mon'));
  end if;
  if t.completable then
    buttons := buttons || jsonb_build_object('action', 'done', 'title', 'Done');
  end if;
  buttons := buttons || jsonb_build_object('action', 'snooze', 'title', 'Snooze 1 hour');
  return jsonb_build_object(
    'title', case when d.kind = 'overdue' then 'Overdue: ' else '' end
      || coalesce(nullif(btrim(i.title), ''), t.label),
    'body', coalesce(line, ''),
    'url', '/item/' || i.id,
    'tag', d.key,
    'actions', buttons
  );
end
$$;
