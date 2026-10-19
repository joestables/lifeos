-- Stage 4 (plan step 4): the food Module's tables. Recipe, Variation and
-- Meal are Items (core.items) with detail tables here; ingredient lines,
-- method steps and the cook log are child rows; the Pantry is a catalogue
-- for everyone, not Items; staples are each Space's. data-model.md;
-- ADR-0011, 0012, 0051, 0052, 0053.
--
-- food          the API: tables read under RLS, and the write functions.
-- food_private  helpers and triggers the API can't reach.

create schema food;
create schema food_private;

grant usage on schema food to authenticated, service_role;
grant usage on schema food_private to authenticated, service_role;

alter default privileges in schema food revoke execute on functions from public;
alter default privileges in schema food_private revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Slots are breakfast, lunch and dinner (Joe, 18 October; ADR-0052).

alter table core.items drop constraint items_slot_check;
alter table core.items add constraint items_slot_check check (slot in ('breakfast', 'lunch', 'dinner'));

-- ---------------------------------------------------------------------------
-- The units a line may have (ADR-0053); none (null) for a count or an
-- unmeasured line. The six aisles (ADR-0012).

create domain food.unit as text check (value in ('g', 'kg', 'ml', 'l', 'tsp', 'tbsp'));
create domain food.aisle as text
  check (value in ('fruit_veg', 'bakery', 'protein', 'chilled', 'cupboard', 'frozen'));

-- ---------------------------------------------------------------------------
-- The Pantry (ADR-0051): one catalogue for everyone signed in. Whoever added
-- an entry may change, merge or delete it; one a line uses can't be deleted.
-- Ingredients have an aisle (Cupboard to start); household items have none.

create table food.pantry (
  id uuid primary key default core_private.uuidv7(),
  name text not null check (length(btrim(name)) between 1 and 200),
  kind text not null default 'ingredient' check (kind in ('ingredient', 'household')),
  aisle food.aisle,
  default_unit food.unit,
  added_by uuid default auth.uid() references core.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'ingredient') = (aisle is not null))
);
create unique index pantry_name on food.pantry (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));
create index pantry_added_by on food.pantry (added_by);

-- Staples and out of stock are each Space's: a Household's, or mine without
-- one (ADR-0051).
create table food.staples (
  space_id uuid not null references core.spaces (id) on delete cascade,
  pantry_id uuid not null references food.pantry (id) on delete cascade,
  out_of_stock boolean not null default false,
  primary key (space_id, pantry_id)
);
create index staples_pantry on food.staples (pantry_id);

-- Each person's lists of categories, cuisines, tags, protein and carbs
-- (ADR-0014). Browsing pools those of everyone in my Households.
create table food.values (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  kind text not null check (kind in ('category', 'cuisine', 'tag', 'protein', 'carb')),
  name text not null check (length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index values_name on food.values (person_id, kind, lower(btrim(name)));

-- ---------------------------------------------------------------------------
-- Detail tables, one row per Item, made by a trigger when the Item is made
-- or converted (below).

-- A Recipe's heading. Its name is the Item's title; its tags, protein and
-- carbs are names from its author's lists.
create table food.recipe (
  item_id uuid primary key references core.items (id) on delete cascade,
  category text,
  cuisine text,
  tags text[] not null default '{}',
  protein text[] not null default '{}',
  carbs text[] not null default '{}',
  default_variation uuid references core.items (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index recipe_default_variation on food.recipe (default_variation);

-- A Variation: its name is the Item's title, its state the Item's status.
-- archived_from keeps its state while its Recipe is archived, so the Recipe
-- comes back as it was (RCP-010).
create table food.variation (
  item_id uuid primary key references core.items (id) on delete cascade,
  servings integer check (servings between 1 and 100),
  prep_min integer check (prep_min between 0 and 10000),
  cook_min integer check (cook_min between 0 and 10000),
  sources text[] not null default '{}',
  notes text check (length(notes) <= 20000),
  archived_from text check (archived_from in ('idea', 'active', 'done')),
  updated_at timestamptz not null default now()
);

-- A Meal: a Recipe's Variation (through the *uses* link), typed (no link;
-- its title is what was typed), or leftovers of another Meal.
create table food.meal (
  item_id uuid primary key references core.items (id) on delete cascade,
  servings integer check (servings between 1 and 100),
  leftovers_of uuid references core.items (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (leftovers_of <> item_id)
);
create index meal_leftovers_of on food.meal (leftovers_of);

-- ---------------------------------------------------------------------------
-- Child rows.

-- An ingredient line (ADR-0053): an amount (optionally a range, or
-- approximate), a unit, and a Pantry entry or the ingredient as typed. A row
-- with a heading is a subheading ("For the sauce") and nothing else.
create table food.variation_lines (
  id uuid primary key default core_private.uuidv7(),
  variation_id uuid not null references core.items (id) on delete cascade,
  position text collate "C" not null,
  heading text check (length(btrim(heading)) between 1 and 200),
  pantry_id uuid references food.pantry (id) on delete restrict,
  text text check (length(text) <= 500),
  qty numeric check (qty >= 0),
  qty_max numeric,
  approx boolean not null default false,
  unit food.unit,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (qty_max is null or (qty is not null and qty_max > qty)),
  check (
    case when heading is not null
      then pantry_id is null and text is null and qty is null and unit is null and not approx
      else pantry_id is not null or nullif(btrim(text), '') is not null
    end
  )
);
create index variation_lines_variation on food.variation_lines (variation_id, position);
create index variation_lines_pantry on food.variation_lines (pantry_id);

-- A method step. "@" references to other Recipes are kept in the text.
create table food.variation_steps (
  id uuid primary key default core_private.uuidv7(),
  variation_id uuid not null references core.items (id) on delete cascade,
  position text collate "C" not null,
  text text not null default '' check (length(text) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index variation_steps_variation on food.variation_steps (variation_id, position);

-- A cook (RCP-012): who, when, a verdict and notes (both optional), the
-- servings cooked, the Meal it was for if any, and a snapshot of the
-- Variation as it was cooked.
create table food.cooks (
  id uuid primary key default core_private.uuidv7(),
  variation_id uuid not null references core.items (id) on delete cascade,
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  cooked_at timestamptz not null default now(),
  verdict smallint check (verdict between 1 and 5),
  notes text check (length(notes) <= 5000),
  servings integer check (servings between 1 and 100),
  meal_id uuid references core.items (id) on delete set null,
  snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cooks_variation on food.cooks (variation_id, cooked_at);
create index cooks_person on food.cooks (person_id, cooked_at);
create index cooks_meal on food.cooks (meal_id);

create trigger pantry_updated_at before update on food.pantry
for each row execute function core_private.touch_updated_at();
create trigger recipe_updated_at before update on food.recipe
for each row execute function core_private.touch_updated_at();
create trigger variation_updated_at before update on food.variation
for each row execute function core_private.touch_updated_at();
create trigger meal_updated_at before update on food.meal
for each row execute function core_private.touch_updated_at();
create trigger variation_lines_updated_at before update on food.variation_lines
for each row execute function core_private.touch_updated_at();
create trigger variation_steps_updated_at before update on food.variation_steps
for each row execute function core_private.touch_updated_at();
create trigger cooks_updated_at before update on food.cooks
for each row execute function core_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Recipes seen through a Household (ADR-0051, ADR-0052): everyone in a
-- Household with me sees all my Recipes and Variations, read-only. Writes
-- stay with the Item's Space, as for every Item.

-- People in any Household with me, me included.
create function core_private.household_peer_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct peer.person_id
  from core.space_members me
  join core.spaces s on s.id = me.space_id and s.kind = 'household'
  join core.space_members peer on peer.space_id = me.space_id
  where me.person_id = (select auth.uid())
$$;

-- Live Recipes and Variations of the people in my Households.
create function core_private.household_food_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select i.id from core.items i
  where i.type in ('recipe', 'variation') and i.archived_at is null
    and i.owner_id in (select core_private.household_peer_ids())
$$;

create or replace function core_private.readable_item_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select i.id from core.items i where i.space_id in (select core_private.my_space_ids())
  union
  select i.id from core.items i
  where i.archived_at is null and i.id in (select core_private.linked_item_ids())
  union
  select core_private.household_food_ids()
$$;

create or replace function core_private.can_read(p_item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.items i
    where i.id = p_item and (
      i.space_id in (select core_private.my_space_ids())
      or (i.type in ('recipe', 'variation') and i.archived_at is null
          and i.owner_id in (select core_private.household_peer_ids()))
    )
  ) or core_private.can_read_via_link(p_item)
$$;

grant execute on function core_private.household_peer_ids() to authenticated;
grant execute on function core_private.household_food_ids() to authenticated;

alter policy "I read what I can see" on core.items
  using (
    space_id in (select core_private.my_space_ids())
    or (archived_at is null and id in (select core_private.linked_item_ids()))
    or (archived_at is null and type in ('recipe', 'variation')
        and owner_id in (select core_private.household_peer_ids()))
  );

-- ---------------------------------------------------------------------------
-- Row-level security.

alter table food.pantry enable row level security;
alter table food.staples enable row level security;
alter table food.values enable row level security;
alter table food.recipe enable row level security;
alter table food.variation enable row level security;
alter table food.meal enable row level security;
alter table food.variation_lines enable row level security;
alter table food.variation_steps enable row level security;
alter table food.cooks enable row level security;

grant select, insert, update, delete on food.pantry to authenticated;
create policy "Everyone signed in reads the Pantry" on food.pantry
  for select to authenticated using (true);
create policy "I add to the Pantry" on food.pantry
  for insert to authenticated with check (added_by = (select auth.uid()));
create policy "I change what I added to the Pantry" on food.pantry
  for update to authenticated
  using (added_by = (select auth.uid())) with check (added_by = (select auth.uid()));
create policy "I remove what I added to the Pantry" on food.pantry
  for delete to authenticated using (added_by = (select auth.uid()));

grant select, insert, update, delete on food.staples to authenticated;
create policy "I read my Spaces' staples" on food.staples
  for select to authenticated using (space_id in (select core_private.my_space_ids()));
create policy "I mark my Spaces' staples" on food.staples
  for insert to authenticated with check (space_id in (select core_private.my_space_ids()));
create policy "I change my Spaces' staples" on food.staples
  for update to authenticated
  using (space_id in (select core_private.my_space_ids()))
  with check (space_id in (select core_private.my_space_ids()));
create policy "I unmark my Spaces' staples" on food.staples
  for delete to authenticated using (space_id in (select core_private.my_space_ids()));

grant select, insert, update, delete on food.values to authenticated;
create policy "I read my lists and my Households'" on food.values
  for select to authenticated
  using (person_id = (select auth.uid()) or person_id in (select core_private.household_peer_ids()));
create policy "I add to my lists" on food.values
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I rename in my lists" on food.values
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));
create policy "I remove from my lists" on food.values
  for delete to authenticated using (person_id = (select auth.uid()));

-- Detail rows are made by triggers, never by people; they go with their Item.
grant select, update on food.recipe, food.variation, food.meal to authenticated;
create policy "I read the heading of what I can see" on food.recipe
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I change the heading of what I can edit" on food.recipe
  for update to authenticated
  using (core_private.can_write(item_id)) with check (core_private.can_write(item_id));
create policy "I read the Variations I can see" on food.variation
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I change the Variations I can edit" on food.variation
  for update to authenticated
  using (core_private.can_write(item_id)) with check (core_private.can_write(item_id));
create policy "I read the Meals I can see" on food.meal
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I change the Meals I can edit" on food.meal
  for update to authenticated
  using (core_private.can_write(item_id)) with check (core_private.can_write(item_id));

grant select, insert, update, delete on food.variation_lines, food.variation_steps to authenticated;
create policy "I read the lines of what I can see" on food.variation_lines
  for select to authenticated using (variation_id in (select core_private.readable_item_ids()));
create policy "I add lines to what I can edit" on food.variation_lines
  for insert to authenticated with check (core_private.can_write(variation_id));
create policy "I change lines of what I can edit" on food.variation_lines
  for update to authenticated
  using (core_private.can_write(variation_id)) with check (core_private.can_write(variation_id));
create policy "I remove lines of what I can edit" on food.variation_lines
  for delete to authenticated using (core_private.can_write(variation_id));
create policy "I read the steps of what I can see" on food.variation_steps
  for select to authenticated using (variation_id in (select core_private.readable_item_ids()));
create policy "I add steps to what I can edit" on food.variation_steps
  for insert to authenticated with check (core_private.can_write(variation_id));
create policy "I change steps of what I can edit" on food.variation_steps
  for update to authenticated
  using (core_private.can_write(variation_id)) with check (core_private.can_write(variation_id));
create policy "I remove steps of what I can edit" on food.variation_steps
  for delete to authenticated using (core_private.can_write(variation_id));

-- I log a cook of any Variation I can see (a Household member's too); the
-- log is seen by whoever can see the Variation; a cook is changed only by
-- whoever logged it.
grant select, insert, update, delete on food.cooks to authenticated;
create policy "I read the cooks of what I can see" on food.cooks
  for select to authenticated using (variation_id in (select core_private.readable_item_ids()));
create policy "I log cooks of what I can see" on food.cooks
  for insert to authenticated
  with check (person_id = (select auth.uid()) and variation_id in (select core_private.readable_item_ids()));
create policy "I change my cooks" on food.cooks
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));
create policy "I remove my cooks" on food.cooks
  for delete to authenticated using (person_id = (select auth.uid()));

grant all on all tables in schema food to service_role;
