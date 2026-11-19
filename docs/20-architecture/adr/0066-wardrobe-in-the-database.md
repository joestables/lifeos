# ADR-0066: Wardrobe in the database

**Status:** Provisionally agreed · 2026-11-18 (Joe)

**As built:** 2026-11-19, plan step 4 ([below](#as-built-19-november-plan-step-4)).

## Context

The [Wardrobe spec](../../10-requirements/modules/wardrobe.md) (WRD-001–028,
agreed by Joe on 18 November) leaves to Stage 6's step 2
([plan](../../50-progress/plans/stage-6.md)) how the schema holds garments,
outfits and the days they're planned for, and how the database keeps the
spec's rules: four required fields, lists in my order, My Outfits holding
every outfit, several outfits and single garments on a day, past days
keeping what they had ([ADR-0013](0013-occurrences-snapshot-their-definition.md)),
and worn worked out. The spec also changed what the data model said about
Wardrobe before its stage: no Wishlist, no price or shop link, no *worn
to*, a Garment not Capturable.

## Decision

1. **Garment, Outfit and Outfit worn are Items** (`core.items`), declared in
   `packages/ontology` under the `wardrobe` Module, orange, always Personal
   and written only by their owner, as Fitness's are
   ([ADR-0058](0058-fitness-in-the-database.md)).
2. **A Garment** is *active* "Owned" or *cancelled* "Retired". No *idea*
   state: a wishlist of clothes will be Shopping's, later (Joe, 18
   November). **It isn't Capturable**: a Thought can't carry its four
   required fields, so no Thought or Note becomes one. Its per-person mark
   is **favourited** (`core.marks`), as a Recipe's is.
3. **A Garment's title is worked out by the database**: its colour, brand
   and category names ("Navy Uniqlo T-shirt"), or its own name when it has
   one. Triggers keep it up to date when the garment changes and when a
   colour, brand or category is renamed, so Search and Week, which read
   `core.items.title`, always have it.
4. **Detail table:** `wardrobe.garment(category_id, size_id, brand_id,
   colour_id, fit_id?, own_name?)`, the four required columns `not null`.
   **Child rows:** `wardrobe.garment_tags(garment_id, tag_id)`. The photo is
   in `core.attachments`, made small on the device with its small copy, as
   a Recipe's is ([ADR-0052](0052-food-in-the-database.md)). No price, no
   shop link.
5. **Reference data, each person's, none to begin with** (Joe, 18
   November): `wardrobe.categories(person, name, position)`,
   `wardrobe.sizes(person, name, position)` (one list for every category),
   `wardrobe.brands(person, name)`, `wardrobe.fits(person, name)`,
   `wardrobe.tags(person, name)`, `wardrobe.colours(person, name, hex)` and
   `wardrobe.collections(person, name, position)`. A name is unique in its
   list, ignoring case and spaces. Garments point at entries by id, so a
   rename reaches them all. An entry in use can't be deleted, only merged:
   the merge function repoints every garment (or outfit), then removes it;
   a Collection can always be deleted, its outfits staying in My Outfits.
   Positions are set by one reorder function per ordered list.
6. **An Outfit** is *active* only. Its optional name is its title (empty
   without one). Its garments are its *includes* links. **My Outfits is
   not stored**: every outfit is in it. Other collections are
   `wardrobe.outfit_collections(outfit_id, collection_id)`. The function
   that makes or changes an outfit refuses a set of garments that is
   exactly another of my outfits', returning that outfit (WRD-014 5).
7. **An Outfit worn is a day's planned outfit or single garment**:
   Schedulable on `do_on`, as a Meal is, with **any number on a day**. It
   *wears* its Outfit, or wears nothing when it is a single garment. Its
   garments are its snapshot, `wardrobe.worn_garments(worn_id,
   garment_id)`: ids, not copies ([ADR-0013](0013-occurrences-snapshot-their-definition.md)).
   A single garment is an Outfit worn of one garment with no *wears*.
   Removing one from a day deletes it, with Undo
   ([ADR-0032](0032-delete-means-archive.md)); removing a garment from a
   day's outfit removes only that day's row.
8. **Changing an outfit changes days to come, not days gone**: adding or
   removing one of its garments does the same on each Outfit worn that
   *wears* it from today on (the owner's today), in the same function.
9. **Worn is worked out, not ticked** (Joe, 18 November): an Outfit worn
   whose day has passed was worn. It is *active* always and not
   Completable. **Last worn** and **times worn** of each garment and outfit
   are worked out on the device from the Outfit worn it holds, as
   readiness is ([ADR-0059](0059-recovery-on-the-device.md)), and never
   stored.
10. **Create outfit from a day** is one function: it makes an Outfit of the
    chosen single garments' garments, in My Outfits, and replaces their
    Outfit worn with one that *wears* it.
11. **The Planned Outfits pane is stored**: `wardrobe.planned_outfits(person,
    outfit_id, position)`, so outfits added on the phone wait on the
    computer too. Placing one on a day makes its Outfit worn and takes it
    out of the pane in one function. **The Outfit builder** (its garments,
    name and collections), Clear after saving, the filters, sort, group and
    card size are kept on the device only.
12. **Retired and deleted garments stay linked.** A retired one stays in
    its outfits and on past days. A deleted one keeps its links and rows
    while in Recently deleted, and the reads leave it out of outfits and
    pickers, so restoring it puts it back where it was (WRD-010 3).
13. **A garment's photo waits on the device for signal** (WRD-005 6): kept
    in IndexedDB with the write queue and uploaded once the garment has
    reached the server, so a garment added offline keeps its photo. A
    Recipe's photo is unchanged (RCP-006 3).
14. **Today and Week draw a day's Outfits worn as one card** (WRD-026).
    They still read `core.items` ([ADR-0029](0029-plan-reads-core-items.md)),
    and the grouping is how Wardrobe's Items look there, which ADR-0029
    lets a Module decide.
15. **Every write is a database function**
    ([ADR-0009](0009-cross-table-writes-are-database-functions.md),
    [ADR-0042](0042-data-layer.md)), through the write queue, offline too.
    **The activity log grows to wardrobe**, by triggers
    ([ADR-0030](0030-activity-log-by-triggers.md)): a garment's fields and
    tags, an outfit's garments, name and collections, an Outfit worn's day
    and garments. Removals that need a `delete` go in a migration of their
    own ([migrations](../../40-operations/migrations.md)).

## Consequences

- The [data model](../data-model.md) changes: Garment's states and Traits
  (not Capturable, favourited), Outfit's state, Outfit worn neither
  Completable nor one a day, the detail tables, and the *worn to* link
  removed. A Thought or Note is no longer converted into a Garment
  ([ADR-0018](0018-changing-an-items-type.md),
  [ADR-0037](0037-thoughts.md)).
- [ADR-0014](0014-reference-data-and-labels.md)'s open Wardrobe point is
  settled: v1's collections become collections of outfits, Wardrobe's own
  reference data, not Labels on garments; tags are Wardrobe's own too.
- With no *worn to* and every Wardrobe Item Personal, no Household sees a
  garment or outfit, through a link or otherwise.
- Database tests cover each rule: the four required fields, owner-only
  writes, names unique per list, entries in use not deleted, merges, the
  title worked out and kept, the same outfit refused, a day's several
  Outfits worn, an outfit's change reaching days to come and not days gone,
  Create outfit from a day, placing from the pane, and a deleted garment
  restored into its outfits.

## As built (19 November, plan step 4)

- **Migrations:** `stage6_wardrobe_schema` (schemas `wardrobe` and
  `wardrobe_private`; the seven lists, settings, the detail table, four
  kinds of child rows; row-level security), `stage6_wardrobe_rules`
  (Personal only; a garment made with its detail, checked when the
  transaction ends; a garment described from its owner's lists; child
  rows' Types and owners; the title worked out and kept; an outfit's added
  garment and new name reaching days to come; the activity log),
  `stage6_wardrobe_writes` (18 functions, each idempotent on its id) and
  `stage6_wardrobe_removing` (the six that need a delete, and the trigger
  taking a garment taken out of an outfit off the days to come).
- **The Planned Outfits pane marks** an outfit taken out of it
  (`removed_at`) rather than deleting the row, so placing an outfit needs
  no delete, and adding it again brings it back (decision 11).
- **The title uses the category's name as written** (decision 3): a
  category called "T-shirt" gives "Navy Uniqlo T-shirt", one called
  "T-shirts", "Navy Uniqlo T-shirts". Categories are named in the singular
  (Joe, 19 November), so titles read as the spec's do.
- **"Same garments" compares the garments still there** (decision 6): a
  deleted garment doesn't count.
- **A garment taken off one day's outfit** is that day's row removed; the
  last one taken off takes the day's entry to Recently deleted.
- **Creating an outfit from a day** archives the single garments' entries
  it replaces (decision 10), so Undo is restoring them.
- 54 database tests in `wardrobe_test`; `wardrobe` in the generated types
  and the local Data API.

Plan step 6 (19 November): `merge_entry` sent again does nothing once its
first entry has gone into the second (migration
`stage6_wardrobe_merge_again`), as every write must be idempotent
(ADR-0042); merging into an entry that isn't mine is still refused.
