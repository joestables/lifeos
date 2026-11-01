-- Stage 5 (plan step 8): Discard (GYM-012 7). A workout in progress that is
-- deleted ends, so another can start (one in progress a person, ADR-0058);
-- brought back with Undo, it is in progress again, unless another has
-- started since. gym.md GYM-008 7, GYM-012 7; ADR-0058.

alter table fitness.workout add column discarded boolean not null default false;

create function fitness_private.discard_workout() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update fitness.workout
    set stage = 'complete', ended_at = greatest(now(), started_at), discarded = true
    where item_id = new.id and stage = 'in_progress';
  elsif new.archived_at is null and old.archived_at is not null then
    update fitness.workout w
    set stage = 'in_progress', ended_at = null, discarded = false
    where w.item_id = new.id and w.discarded
      and not exists (
        select 1 from fitness.workout o
        where o.owner_id = w.owner_id and o.stage = 'in_progress'
      );
  end if;
  return null;
end
$$;

create trigger items_workout_discard after update of archived_at on core.items
for each row when (new.type = 'workout')
execute function fitness_private.discard_workout();
