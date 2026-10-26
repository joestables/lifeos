-- Stage 4b (step 10, Joe's second round): the Recipes I viewed last, so
-- Add a meal offers the three I looked at most recently (MPL-002 1, Joe, 26
-- October). Each person's own: no one else reads them. A row per Recipe,
-- its time moved on each view; it goes with its Recipe.

create table food.recent_views (
  person_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id uuid not null references core.items (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (person_id, recipe_id)
);
create index recent_views_recipe on food.recent_views (recipe_id);

alter table food.recent_views enable row level security;
grant select, insert, update on food.recent_views to authenticated;
create policy "I read what I viewed" on food.recent_views
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I note what I view" on food.recent_views
  for insert to authenticated
  with check (person_id = (select auth.uid()) and core_private.can_read(recipe_id));
create policy "I move on what I viewed" on food.recent_views
  for update to authenticated
  using (person_id = (select auth.uid()))
  with check (person_id = (select auth.uid()));

-- A Recipe viewed, now or when the queue sends it (`p_at`, the time on the
-- device): the later of that and any earlier view.
create function food.view_recipe(p_recipe uuid, p_at timestamptz default now())
returns void
language sql set search_path = '' as $$
  insert into food.recent_views (recipe_id, viewed_at)
  select p_recipe, least(coalesce(p_at, now()), now())
  where exists (select 1 from core.items i where i.id = p_recipe and i.type = 'recipe')
  on conflict (person_id, recipe_id) do update
    set viewed_at = greatest(food.recent_views.viewed_at, excluded.viewed_at)
$$;
grant execute on function food.view_recipe(uuid, timestamptz) to authenticated;
