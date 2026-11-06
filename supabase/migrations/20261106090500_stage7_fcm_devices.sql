-- Stage 7, step 7 (ADR-0063): the Android app is an FCM device. It
-- registers its FCM token as its endpoint; send-notifications learns each
-- device's kind, reads the Firebase key from Vault, and sends to the
-- Android app by Firebase Cloud Messaging; a notification carries its
-- Type's colour.

-- Registering the Android app (REM-001 4): its FCM token is the endpoint;
-- registering it again turns it back on.
create function core.register_fcm_device(p_id uuid, p_token text, p_label text)
returns core.push_devices
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r core.push_devices;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) < 20 or length(p_token) > 2000 then
    raise exception 'Not a device token' using errcode = '22023';
  end if;
  insert into core.push_devices (id, person_id, kind, endpoint, label)
  values (p_id, me, 'fcm', p_token, left(coalesce(p_label, ''), 100))
  on conflict (endpoint) do update set
    person_id = me,
    kind = 'fcm',
    p256dh = null,
    auth = null,
    label = excluded.label,
    enabled = true,
    gone_at = null
  returning * into r;
  return r;
end
$$;
grant execute on function core.register_fcm_device(uuid, text, text) to authenticated;

-- The Firebase service account's key, kept in Vault (integration-setup.md),
-- for send-notifications only.
create function core.fcm_service_account()
returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'fcm_service_account'
$$;
grant execute on function core.fcm_service_account() to service_role;

-- What is claimed now says each device's kind, so Web Push and FCM devices
-- are each sent their own way. Otherwise as before.
drop function core.claim_deliveries(integer);
create function core.claim_deliveries(p_limit integer default 100)
returns table(id bigint, kind text, endpoint text, p256dh text, auth text, ttl integer, payload jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  update core.reminder_deliveries x set status = 'skipped'
  from core.push_devices d
  where d.id = x.device_id and x.status in ('waiting', 'failed') and x.fire_at <= now()
    and (not d.enabled or d.gone_at is not null
         or (x.kind <> 'digest' and not core_private.item_open(x.item_id))
         or (x.kind <> 'digest' and not core_private.readable_by(x.person_id, x.item_id))
         or (x.kind = 'reminder' and x.reminder_id is null));
  update core.reminder_deliveries x set status = 'missed'
  where x.status in ('waiting', 'failed') and x.fire_at <= now() - interval '12 hours';

  return query
  with taken as (
    select x.id from core.reminder_deliveries x
    where x.fire_at <= now()
      and (x.status in ('waiting', 'failed')
           or (x.status = 'sending' and x.claimed_at < now() - interval '5 minutes'))
    order by x.fire_at
    limit least(greatest(p_limit, 1), 500)
    for update skip locked
  ), claimed as (
    update core.reminder_deliveries x
    set status = 'sending', claimed_at = now(), attempts = x.attempts + 1
    from taken where x.id = taken.id
    returning x.*
  )
  select c.id, d.kind, d.endpoint, d.p256dh, d.auth,
    greatest(60, extract(epoch from (c.fire_at + interval '12 hours' - now()))::int),
    core_private.notification_payload(c) || jsonb_build_object('delivery', c.id, 'token', c.token)
  from claimed c join core.push_devices d on d.id = c.device_id;
end
$$;
grant execute on function core.claim_deliveries(int) to service_role;

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
    'actions', buttons,
    -- Its Type's colour, which the Android app tints the notification with.
    'colour', t.colour
  );
end
$$;
