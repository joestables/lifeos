# Spaces and sharing

*Sign-up and Personal Spaces come in Stage 1, and their requirements are
below. Contacts, Households and sharing come in Stage 4; their requirements
are written then.*

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
- **Enforcement** through one rule in `core_private`, benchmarked in Stage 1
  at a few milliseconds; goal
  progress read through the goal; only an Item's owner can link it to a
  shared Item; child rows readable when their Item is
  ([ADR-0017](../../20-architecture/adr/0017-enforcing-visibility.md),
  Provisionally agreed).
- **Default Space per Type** ([data model](../../20-architecture/data-model.md#types)).
  Gym sessions, Thoughts and Notes are always Personal. A Variation always
  has its Recipe's Space.
- **Per person on shared Items:** Reminders, snooze, marks (a starred Task, a favourited Recipe), Inbox
  dismiss / snooze.

## Open

- Deleting an account and its data: needed once anyone can sign up; which
  stage?
- How Contact search avoids revealing who has an account; whether a
  Contact can be removed ([ADR-0039](../../20-architecture/adr/0039-accounts-contacts-households.md)).
- Leaving the Household: "created by" decides ownership, or the leaver takes
  a copy ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md)).

## Requirements

*Stage 1. Statuses: proposed → agreed → built → verified.*

### ACC-001 — Sign up and sign in with Google

**As** anyone, **I want** to start using LifeOS with my Google account,
**so that** there is no new password to manage.
Priority: Must · Status: verified (the real Google round trip checked by hand: Joe signed in, 10 October 2026)

Acceptance criteria
1. Given I have no account, when I choose to continue with Google and
   consent, then an account is created with my own Personal Space, and I land
   in the app with the navigation drawer.
2. Given I have an account, when I sign in with Google on another device,
   then I see the same data.
3. Given the sign-in page, then there is no email-and-password sign-up.

### ACC-002 — My Items are mine

**As** a person using LifeOS, **I want** everything I create to be visible
only to me, **so that** I can trust it with my life.
Priority: Must · Status: verified

Acceptance criteria
1. Given two accounts, A and B, when A creates an Item, then B cannot read
   it — through the app or directly through the API (database test).
2. Given the same two accounts, when A's Item changes, then the activity
   log entry for it is readable by A only (database test).

### ACC-003 — Sign out

**As** a person using a shared or borrowed device, **I want** to sign out,
**so that** the next person can't see my data.
Priority: Must · Status: verified

Acceptance criteria
1. Given I am signed in, when I sign out, then I return to the sign-in page
   and my data is removed from the device's local cache.
2. Given I sign out with writes still queued, then I am warned that they
   haven't been sent before I confirm.
3. Given notifications were on for this device, when I sign out, then they
   stop: nothing more arrives on it.

Non-goals (Stage 1): Contacts, Households and invitations (Stage 4); other
sign-in providers; deleting an account (open, above).
