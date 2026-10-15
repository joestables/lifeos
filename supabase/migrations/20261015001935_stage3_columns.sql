-- Stage 3's new columns (plan step 4): whether a Type has a place, an
-- Item's place, all-day Events kept as dates, and the Types I've hidden on
-- Plan. The functions that use them follow in the stage3_* migrations after it.

-- ---------------------------------------------------------------------------
-- The ontology's lookup table gains whether a Type has a place (filled by
-- the generated *_ontology.sql migration that follows).

alter table core.item_types add column has_place boolean not null default false;

-- ---------------------------------------------------------------------------
-- An Item's place: where an Event happens (EVT-001).

alter table core.items add column place text check (length(place) <= 500);

-- An all-day Event keeps its days as dates, the same in any timezone
-- (EVT-001 3): starts_at is midnight UTC of its first day and ends_at
-- midnight UTC of the day after its last, as Google keeps them.
alter table core.items add constraint items_all_day_dates check (
  all_day is not true
  or ((starts_at at time zone 'UTC')::time = '00:00'
      and (ends_at is null or (ends_at at time zone 'UTC')::time = '00:00'))
);

-- ---------------------------------------------------------------------------
-- My Plan settings (PLN-004): the Types I've hidden, on every device. Hidden
-- rather than shown, so a Type a later stage adds shows until I hide it.

alter table core.people
  add column plan_hidden_types text[] not null default '{}';
grant update (plan_hidden_types) on core.people to authenticated;
