# ADR-0049: How Plan reads a week

**Status:** Provisionally agreed · 2026-10-14

## Context

[ADR-0029](0029-plan-reads-core-items.md) has Plan read `core.items`, so a
new Schedulable Type shows with no Plan work. The
[Plan spec](../../10-requirements/views/week.md#requirements) (PLN-001–007)
puts each Item on the local date of `starts_at`, else `do_on`, else
`due_on`, an Event over several days on each of them, every occurrence of a
repeat, and remembers the Types I've hidden on every device.

## Decision

- **One read function**, `core.plan_items(from_date, to_date)`, run as the
  caller under RLS: the Schedulable Items that are on any day in the range,
  in my home timezone, not archived and not *skipped*, each with its first
  and last day on Plan, whether it repeats, and, for an Event from Google,
  its calendar's name and whether it can be changed. An index on the date
  Plan shows keeps it quick.
- **Modules enrich later** by joining their published view in this function,
  as ADR-0029 allows; nothing changes for the Types that don't.
- **The app places Items from what the device already holds** (amended 16
  October by Claude, for Joe to confirm): the data layer already keeps every
  Item I can see, with unsent changes laid over them
  ([ADR-0042](0042-data-layer.md)), so Plan works out each Item's days on
  the device by the same rules as `core.plan_items` (`src/lib/plan.ts`).
  Every week, earlier or later, shows at once and offline (OFF-005), and a
  change shows on Plan the moment it is made. `core.plan_items` stays the
  server's statement of those rules, for Modules joining their views and
  for anything reading Plan without the app. *Was:* the app reads a week at
  a time from `core.plan_items`, caching the weeks read.
- **Hidden Types, not shown Types.** My settings (`core.people`) keep the
  Types I've hidden from Plan, so a Type added in a later stage shows until I
  hide it (PLN-004). Week or Day on a computer is kept on that device only.
- **Moving and adding use the existing write functions**
  (`core.update_item`, `core.create_item`); dragging is an update of the
  date fields, with Undo as elsewhere.

## Consequences

Plan needs no knowledge of Meals, Shopping lists or Workouts until their Modules want
a subtitle or icon.
