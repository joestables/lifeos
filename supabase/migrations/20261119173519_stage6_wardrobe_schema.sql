-- Stage 6 (plan step 4): the wardrobe Module's tables. Garment, Outfit and
-- Outfit worn are Items (core.items), always Personal; their detail and
-- child rows are here, with each person's lists as reference data, none to
-- begin with. wardrobe.md; ADR-0066, ADR-0067, ADR-0068.
--
-- wardrobe          the API: tables read under RLS, and the write functions.
-- wardrobe_private  helpers and triggers the API can't reach.

create schema wardrobe;
create schema wardrobe_private;

grant usage on schema wardrobe to authenticated, service_role;
grant usage on schema wardrobe_private to authenticated, service_role;

alter default privileges in schema wardrobe revoke execute on functions from public;
alter default privileges in schema wardrobe_private revoke execute on functions from public;

-- A list entry's name, as compared: no case, spaces trimmed and single.
create function wardrobe_private.name_key(p_name text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g'))
$$;
grant execute on function wardrobe_private.name_key(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reference data, each person's, none to begin with (ADR-0066 5; WRD-028).
-- Categories, Sizes and Collections are in my order (`position`, compared
-- byte by byte); the rest are A–Z. Garments point at entries by id, so a
-- rename reaches them all.

create table wardrobe.categories (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  position text collate "C" not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name on wardrobe.categories (person_id, wardrobe_private.name_key(name));

-- One list of sizes for every category (Joe, 18 November).
create table wardrobe.sizes (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 20),
  position text collate "C" not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sizes_name on wardrobe.sizes (person_id, wardrobe_private.name_key(name));

create table wardrobe.brands (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index brands_name on wardrobe.brands (person_id, wardrobe_private.name_key(name));

create table wardrobe.fits (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index fits_name on wardrobe.fits (person_id, wardrobe_private.name_key(name));

create table wardrobe.tags (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tags_name on wardrobe.tags (person_id, wardrobe_private.name_key(name));

-- A colour: a name and its swatch, stored as hex (ADR-0067 5).
create table wardrobe.colours (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  hex text not null check (hex ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index colours_name on wardrobe.colours (person_id, wardrobe_private.name_key(name));

-- My own collections of outfits; My Outfits isn't one of them, as every
-- outfit is in it (ADR-0066 6).
create table wardrobe.collections (
  id uuid primary key default core_private.uuidv7(),
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40 and wardrobe_private.name_key(name) <> 'my outfits'),
  position text collate "C" not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index collections_name on wardrobe.collections (person_id, wardrobe_private.name_key(name));

-- The weather's place (ADR-0068 4): its name and where it is, or none.
create table wardrobe.settings (
  person_id uuid primary key default auth.uid() references core.people (id) on delete cascade,
  place_name text check (length(btrim(place_name)) between 1 and 120),
  latitude numeric(8,5) check (latitude between -90 and 90),
  longitude numeric(8,5) check (longitude between -180 and 180),
  updated_at timestamptz not null default now(),
  check ((place_name is null) = (latitude is null) and (latitude is null) = (longitude is null))
);

-- ---------------------------------------------------------------------------
-- A Garment's detail (ADR-0066 4): its four required fields, an optional
-- fit and an optional name of its own. Made with its Item by
-- wardrobe.create_garment (stage6_wardrobe_writes). Its photo is in
-- core.attachments.

create table wardrobe.garment (
  item_id uuid primary key references core.items (id) on delete cascade,
  category_id uuid not null references wardrobe.categories (id) on delete restrict,
  size_id uuid not null references wardrobe.sizes (id) on delete restrict,
  brand_id uuid not null references wardrobe.brands (id) on delete restrict,
  colour_id uuid not null references wardrobe.colours (id) on delete restrict,
  fit_id uuid references wardrobe.fits (id) on delete restrict,
  own_name text check (length(btrim(own_name)) between 1 and 80),
  updated_at timestamptz not null default now()
);
create index garment_category on wardrobe.garment (category_id);
create index garment_size on wardrobe.garment (size_id);
create index garment_brand on wardrobe.garment (brand_id);
create index garment_colour on wardrobe.garment (colour_id);
create index garment_fit on wardrobe.garment (fit_id);

-- ---------------------------------------------------------------------------
-- Child rows.

-- A Garment's tags (WRD-008 3, WRD-012).
create table wardrobe.garment_tags (
  garment_id uuid not null references core.items (id) on delete cascade,
  tag_id uuid not null references wardrobe.tags (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (garment_id, tag_id)
);
create index garment_tags_tag on wardrobe.garment_tags (tag_id);

-- An Outfit's own collections (WRD-018); a collection can always be
-- deleted, its outfits staying in My Outfits.
create table wardrobe.outfit_collections (
  outfit_id uuid not null references core.items (id) on delete cascade,
  collection_id uuid not null references wardrobe.collections (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (outfit_id, collection_id)
);
create index outfit_collections_collection on wardrobe.outfit_collections (collection_id);

-- An Outfit worn's garments: its snapshot, garment ids (ADR-0013, ADR-0066 7).
create table wardrobe.worn_garments (
  worn_id uuid not null references core.items (id) on delete cascade,
  garment_id uuid not null references core.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (worn_id, garment_id)
);
create index worn_garments_garment on wardrobe.worn_garments (garment_id);

-- The Planned Outfits pane (ADR-0066 11), stored so it is the same on
-- every device; an outfit taken out of it is marked, not deleted, and comes
-- back when added again.
create table wardrobe.planned_outfits (
  person_id uuid not null default auth.uid() references core.people (id) on delete cascade,
  outfit_id uuid not null references core.items (id) on delete cascade,
  position text collate "C" not null,
  removed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (person_id, outfit_id)
);
create index planned_outfits_outfit on wardrobe.planned_outfits (outfit_id);

create trigger categories_updated_at before update on wardrobe.categories
for each row execute function core_private.touch_updated_at();
create trigger sizes_updated_at before update on wardrobe.sizes
for each row execute function core_private.touch_updated_at();
create trigger brands_updated_at before update on wardrobe.brands
for each row execute function core_private.touch_updated_at();
create trigger fits_updated_at before update on wardrobe.fits
for each row execute function core_private.touch_updated_at();
create trigger tags_updated_at before update on wardrobe.tags
for each row execute function core_private.touch_updated_at();
create trigger colours_updated_at before update on wardrobe.colours
for each row execute function core_private.touch_updated_at();
create trigger collections_updated_at before update on wardrobe.collections
for each row execute function core_private.touch_updated_at();
create trigger settings_updated_at before update on wardrobe.settings
for each row execute function core_private.touch_updated_at();
create trigger garment_updated_at before update on wardrobe.garment
for each row execute function core_private.touch_updated_at();
create trigger planned_outfits_updated_at before update on wardrobe.planned_outfits
for each row execute function core_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security. The Wardrobe is Personal (ADR-0066 1): my lists are
-- mine, and the rest follows the Item's Space, as for every Item.

alter table wardrobe.categories enable row level security;
alter table wardrobe.sizes enable row level security;
alter table wardrobe.brands enable row level security;
alter table wardrobe.fits enable row level security;
alter table wardrobe.tags enable row level security;
alter table wardrobe.colours enable row level security;
alter table wardrobe.collections enable row level security;
alter table wardrobe.settings enable row level security;
alter table wardrobe.garment enable row level security;
alter table wardrobe.garment_tags enable row level security;
alter table wardrobe.outfit_collections enable row level security;
alter table wardrobe.worn_garments enable row level security;
alter table wardrobe.planned_outfits enable row level security;

grant select, insert, update on wardrobe.categories, wardrobe.sizes, wardrobe.brands,
  wardrobe.fits, wardrobe.tags, wardrobe.colours, wardrobe.collections, wardrobe.settings,
  wardrobe.planned_outfits to authenticated;

create policy "I read my categories" on wardrobe.categories
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add categories" on wardrobe.categories
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my categories" on wardrobe.categories
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my sizes" on wardrobe.sizes
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add sizes" on wardrobe.sizes
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my sizes" on wardrobe.sizes
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my brands" on wardrobe.brands
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add brands" on wardrobe.brands
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my brands" on wardrobe.brands
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my fits" on wardrobe.fits
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add fits" on wardrobe.fits
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my fits" on wardrobe.fits
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my tags" on wardrobe.tags
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add tags" on wardrobe.tags
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my tags" on wardrobe.tags
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my colours" on wardrobe.colours
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add colours" on wardrobe.colours
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my colours" on wardrobe.colours
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my collections" on wardrobe.collections
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add collections" on wardrobe.collections
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my collections" on wardrobe.collections
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my Wardrobe settings" on wardrobe.settings
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I set my Wardrobe settings" on wardrobe.settings
  for insert to authenticated with check (person_id = (select auth.uid()));
create policy "I change my Wardrobe settings" on wardrobe.settings
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

create policy "I read my Planned outfits" on wardrobe.planned_outfits
  for select to authenticated using (person_id = (select auth.uid()));
create policy "I add to my Planned outfits" on wardrobe.planned_outfits
  for insert to authenticated
  with check (person_id = (select auth.uid()) and core_private.can_write(outfit_id));
create policy "I change my Planned outfits" on wardrobe.planned_outfits
  for update to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));

-- A Garment's detail: made with its Item, by its owner; it goes with its Item.
grant select, insert, update on wardrobe.garment to authenticated;
create policy "I read the garments I can see" on wardrobe.garment
  for select to authenticated using (item_id in (select core_private.readable_item_ids()));
create policy "I describe the garments I can edit" on wardrobe.garment
  for insert to authenticated with check (core_private.can_write(item_id));
create policy "I change the garments I can edit" on wardrobe.garment
  for update to authenticated
  using (core_private.can_write(item_id)) with check (core_private.can_write(item_id));

grant select, insert on wardrobe.garment_tags, wardrobe.outfit_collections,
  wardrobe.worn_garments to authenticated;

create policy "I read the tags of garments I can see" on wardrobe.garment_tags
  for select to authenticated using (garment_id in (select core_private.readable_item_ids()));
create policy "I tag the garments I can edit" on wardrobe.garment_tags
  for insert to authenticated with check (core_private.can_write(garment_id));

create policy "I read the collections of outfits I can see" on wardrobe.outfit_collections
  for select to authenticated using (outfit_id in (select core_private.readable_item_ids()));
create policy "I file the outfits I can edit" on wardrobe.outfit_collections
  for insert to authenticated with check (core_private.can_write(outfit_id));

create policy "I read the garments of days I can see" on wardrobe.worn_garments
  for select to authenticated using (worn_id in (select core_private.readable_item_ids()));
create policy "I put garments on days I can edit" on wardrobe.worn_garments
  for insert to authenticated
  with check (core_private.can_write(worn_id) and core_private.can_write(garment_id));

grant all on all tables in schema wardrobe to service_role;
