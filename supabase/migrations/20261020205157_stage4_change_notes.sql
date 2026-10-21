-- Stage 4 (plan step 5): a note on a Recipe's change (RCP-013, Joe, 20
-- October). The log says "Edited" for a change; whoever made it may say in
-- their own words what changed. A note belongs to the activity entry its
-- change starts with, and is read by whoever can read the Item.

create table food.change_notes (
  activity_id bigint primary key references core.activity (id) on delete cascade,
  item_id uuid not null references core.items (id) on delete cascade,
  note text not null check (length(btrim(note)) between 1 and 500),
  person_id uuid not null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index change_notes_item on food.change_notes (item_id);

alter table food.change_notes enable row level security;
grant select, insert, update, delete on food.change_notes to authenticated;
create policy "I read the notes on what I can see" on food.change_notes
  for select to authenticated using (core_private.can_read(item_id));
create policy "I note my own changes" on food.change_notes
  for insert to authenticated
  with check (person_id = (select auth.uid()) and core_private.can_write(item_id));
create policy "I change my own notes" on food.change_notes
  for update to authenticated
  using (person_id = (select auth.uid()))
  with check (person_id = (select auth.uid()) and core_private.can_write(item_id));
create policy "I remove my own notes" on food.change_notes
  for delete to authenticated using (person_id = (select auth.uid()));

-- A note on my change, in place of any it had; empty, the note goes.
-- Only the person who made the change may note it.
create function food.note_change(p_activity bigint, p_note text)
returns void
language plpgsql set search_path = '' as $$
declare
  a core.activity;
begin
  select * into a from core.activity where id = p_activity;
  if a.id is null then
    raise exception 'No change % to note', p_activity using errcode = 'P0002';
  end if;
  if a.actor is distinct from (select auth.uid()) then
    raise exception 'Only who made a change notes it' using errcode = '42501';
  end if;
  if nullif(btrim(p_note), '') is null then
    delete from food.change_notes where activity_id = p_activity;
    return;
  end if;
  insert into food.change_notes (activity_id, item_id, note)
  values (p_activity, a.item_id, btrim(p_note))
  on conflict (activity_id) do update set note = excluded.note, updated_at = now();
end
$$;
grant execute on function food.note_change(bigint, text) to authenticated;
