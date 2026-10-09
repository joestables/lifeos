# Spaces and sharing

*Requirements not yet written; this page records the decisions they build
on. Household sharing is switched on in Stage 4.*

## Decisions

- **Personal and Household Spaces**; visibility follows links, one hop,
  read-only, shown in the interface, and rules expose nothing; leaving the
  Household makes the shared Items you created Personal
  ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md),
  Provisionally agreed).
- **Enforcement** through `core.can_read`, benchmarked in Stage 1; goal
  progress read through the goal; only an Item's owner can link it to a
  shared Item; child rows readable when their Item is; joining by invitation,
  which creates the account
  ([ADR-0017](../../20-architecture/adr/0017-enforcing-visibility.md),
  Proposed).
- **Default Space per Type** ([data model](../../20-architecture/data-model.md#types)).
  Gym sessions are always Personal. A Variation always has its Recipe's
  Space.
- **Per person on shared Items:** Reminders, snooze, stars, recent, Inbox
  dismiss / snooze.

## Open

- Leaving the Household: "created by" decides ownership, or the leaver takes
  a copy ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md)).
