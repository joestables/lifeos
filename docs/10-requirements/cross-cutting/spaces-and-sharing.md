# Spaces and sharing

*Requirements not yet written; this page records the decisions they build
on. Sign-up and Personal Spaces come in Stage 1; Contacts, Households and
sharing in Stage 4.*

## Decisions

- **Anyone can sign up with Google** and use LifeOS personally. People
  connect as **Contacts** by searching a Google email and accepting a
  request; then either can create a **Household** and invite the other, and
  sharing starts only when the invitation is accepted
  ([ADR-0039](../../20-architecture/adr/0039-accounts-contacts-households.md),
  Provisionally agreed).

- **Personal and Household Spaces**; visibility follows links, one hop,
  read-only, shown in the interface, and rules expose nothing; leaving the
  Household makes the shared Items you created Personal
  ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md),
  Provisionally agreed).
- **Enforcement** through `core.can_read`, benchmarked in Stage 1; goal
  progress read through the goal; only an Item's owner can link it to a
  shared Item; child rows readable when their Item is
  ([ADR-0017](../../20-architecture/adr/0017-enforcing-visibility.md),
  Provisionally agreed).
- **Default Space per Type** ([data model](../../20-architecture/data-model.md#types)).
  Gym sessions, Thoughts and Notes are always Personal. A Variation always has its Recipe's
  Space.
- **Per person on shared Items:** Reminders, snooze, stars, recent, Inbox
  dismiss / snooze.

## Open

- How Contact search avoids revealing who has an account; whether a
  Contact can be removed ([ADR-0039](../../20-architecture/adr/0039-accounts-contacts-households.md)).
- Leaving the Household: "created by" decides ownership, or the leaver takes
  a copy ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md)).
