-- The multi-user bug hunt (4 November 2026), before people other than Joe
-- use LifeOS. Each hole was shown on the live project as a second, made-up
-- person in a transaction rolled back.

-- ---------------------------------------------------------------------------
-- Who made an Item stays who made it. A Household member could set
-- owner_id to themselves on someone else's shared Item and then move it to
-- their own Personal Space, round "only its maker moves it" (HSH-003 3).
-- Nothing in the app changes an owner; the server's own jobs, signed in as
-- no one, are left alone.

create function core_private.keep_owner()
returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and new.owner_id is distinct from old.owner_id then
    raise exception 'Who made a % can''t be changed', tg_table_name using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger items_keep_owner before update of owner_id on core.items
  for each row execute function core_private.keep_owner();
create trigger series_keep_owner before update of owner_id on core.series
  for each row execute function core_private.keep_owner();

-- ---------------------------------------------------------------------------
-- A row of mine pointed at something I can't see. Adding one checks the
-- Item can be seen; changing one didn't, so a Reminder could be moved onto
-- anyone's private Task (its title then arriving as my notification), a
-- cook onto anyone's Variation, a recent view onto anyone's Recipe.

alter policy "I change my Reminders" on core.reminders
  with check (
    person_id = (select auth.uid())
    and item_id in (select core_private.readable_item_ids())
  );

alter policy "I change my cooks" on food.cooks
  with check (
    person_id = (select auth.uid())
    and variation_id in (select core_private.readable_item_ids())
  );

alter policy "I move on what I viewed" on food.recent_views
  with check (
    person_id = (select auth.uid())
    and core_private.can_read(recipe_id)
  );

-- ---------------------------------------------------------------------------
-- Notifications only about what the person can still see (REM-004). Someone
-- who left a Household, or was removed, kept their Reminders on its Items:
-- the titles kept arriving, and the notification's Done still ticked the
-- Item off.

-- core_private.can_read for a given person rather than the one signed in:
-- the minute job runs as no one.
create function core_private.readable_by(p_person uuid, p_item uuid)
returns boolean
language sql stable set search_path = '' as $$
  with mine as (select m.space_id from core.space_members m where m.person_id = p_person)
  select exists (
    select 1 from core.items i
    where i.id = p_item and (
      i.space_id in (select space_id from mine)
      or (i.archived_at is null and i.type in ('recipe', 'variation') and i.owner_id in (
        select peer.person_id
        from core.space_members me
        join core.spaces s on s.id = me.space_id and s.kind = 'household'
        join core.space_members peer on peer.space_id = me.space_id
        where me.person_id = p_person))
      or (i.archived_at is null and exists (
        select 1 from core.links l
        join core.items o on o.id = case when l.from_item = i.id then l.to_item else l.from_item end
        where (l.from_item = i.id or l.to_item = i.id)
          and o.archived_at is null and o.space_id in (select space_id from mine)))
    )
  )
$$;

revoke execute on function core_private.readable_by(uuid, uuid) from public, anon, authenticated;

create or replace function core.claim_deliveries(p_limit integer default 100)
returns table(id bigint, endpoint text, p256dh text, auth text, ttl integer, payload jsonb)
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
  select c.id, d.endpoint, d.p256dh, d.auth,
    greatest(60, extract(epoch from (c.fire_at + interval '12 hours' - now()))::int),
    core_private.notification_payload(c) || jsonb_build_object('delivery', c.id, 'token', c.token)
  from claimed c join core.push_devices d on d.id = c.device_id;
end
$$;

create or replace function core.act_on_delivery(
  p_delivery bigint, p_token uuid, p_action text, p_next uuid default null, p_next_on date default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  x core.reminder_deliveries;
  i core.items;
  s core.series;
begin
  select * into x from core.reminder_deliveries where id = p_delivery and token = p_token;
  if x.id is null then
    return false;
  end if;
  select * into i from core.items where id = x.item_id;

  if p_action = 'done' then
    if i.id is null or not (select completable from core.item_types where key = i.type) then
      return false;
    end if;
    -- Only by someone who may still change it: not after leaving its Household.
    if not exists (
      select 1 from core.space_members m where m.person_id = x.person_id and m.space_id = i.space_id
    ) then
      return false;
    end if;
    -- The person did it, so it counts as their change (ADR-0022).
    update core.items set status = 'done' where id = i.id and status <> 'done';
    select * into s from core.series where id = i.series_id;
    if s.mode = 'after_completion' and s.ended_on is null and p_next_on is not null then
      perform core_private.make_occurrences(
        s, jsonb_build_array(jsonb_build_object('id', p_next, 'on', p_next_on)));
      update core.series set generated_until = greatest(generated_until, p_next_on) where id = s.id;
    end if;
    return true;
  elsif p_action = 'snooze' then
    -- An hour from now, however often it's pressed; mine only.
    if x.kind = 'reminder' and x.reminder_id is not null then
      update core.reminders set snoozed_until = now() + interval '1 hour'
      where id = x.reminder_id and person_id = x.person_id;
    else
      insert into core.reminder_deliveries (kind, key, person_id, device_id, item_id, fire_at)
      select x.kind, x.key, x.person_id, d.id, x.item_id, date_trunc('minute', now()) + interval '1 hour'
      from core.push_devices d where d.person_id = x.person_id and d.enabled and d.gone_at is null
      on conflict (key, fire_at, device_id) do nothing;
    end if;
    return true;
  end if;
  return false;
end
$$;
