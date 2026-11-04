# Spaces and sharing

*Sign-up and Personal Spaces came in Stage 1. Households and sharing come
in Stage 4: their requirements (HSH-*) are a draft for Joe to refine, all
*proposed*. Households belong to the core and serve every Module; how food
is shared is in [recipes](../modules/recipes.md) and
[meals](../modules/meals.md).*

## Decisions

- **Anyone can sign up with Google** and use LifeOS personally. Anyone can
  create a **Household** and is its **owner**; the owner invites people by
  their Google email, and sharing starts only when an invitation is
  accepted. **Members** can't invite. A person may be in several Households
  (Joe, 18 October;
  [ADR-0039](../../20-architecture/adr/0039-accounts-contacts-households.md),
  Provisionally agreed).
- **Personal and Household Spaces**; visibility follows links, one hop,
  read-only, shown in the interface, and rules expose nothing; leaving the
  Household makes the shared Items you created Personal
  ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md),
  Provisionally agreed).
- **Food is shared its own way:** everyone in a Household sees each
  other's Recipes, read-only, and may add their own Variations; the Pantry
  is one for everyone; a food shop is for one Space, starting as the
  Household of its first Household Meal ([ADR-0051](../../20-architecture/adr/0051-who-sees-food.md),
  Provisionally agreed; [recipes](../modules/recipes.md),
  [meals](../modules/meals.md)).
- **Enforcement** through one rule in `core_private`, benchmarked in Stage 1
  at a few milliseconds; goal
  progress read through the goal; only an Item's owner can link it to a
  shared Item; child rows readable when their Item is
  ([ADR-0017](../../20-architecture/adr/0017-enforcing-visibility.md),
  Provisionally agreed).
- **Default Space per Type** ([data model](../../20-architecture/data-model.md#types)).
  Gym sessions, Thoughts and Notes are always Personal. A Recipe is its
  author's, and a Variation its own author's (ADR-0051).
- **Per person on shared Items:** Reminders, snooze, marks (a starred Task, a favourited Recipe), Inbox
  dismiss / snooze.
- **Tasks and Events are shared with a Household** (Joe, 4 November;
  [HSH-005](#hsh-005--share-tasks-and-events)): chosen in their popup's
  Space, at its foot. Nobody is assigned: a shared Task is everyone's, and
  whoever ticks it ticks it for all. Every member gets their own default
  Reminder, can change it, and can delete the Item. A shared Event goes to
  every member's default Google calendar.

## Open

- Deleting an account and its data: needed once anyone can sign up; which
  stage?
- Leaving a Household: "created by" decides ownership, or the leaver takes
  a copy ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md)).
  For food it is settled: a leaver keeps their Variations, under a copy of
  the Recipe's heading ([ADR-0051](../../20-architecture/adr/0051-who-sees-food.md)).
- What happens to a Household when its owner goes: settled — the owner
  can't leave, only delete it, for everyone (Joe, 18 October; HSH-004).

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
   and my data is removed from the device: its local cache, the photos kept
   for offline and what pages remembered (multi-user bug hunt, 4 November).
2. Given I sign out with writes still queued, then I am warned that they
   haven't been sent before I confirm.
3. Given notifications were on for this device, when I sign out, then they
   stop: nothing more arrives on it.
4. Given my session here ended without signing out (signed out on another
   device, or expired), when someone else signs in on this device, then
   what it kept for me is removed first — cache, unsent writes, photos,
   what pages remembered — and my notifications stop arriving on it; my
   unsent writes are never sent as them (multi-user bug hunt, 4 November).

Non-goals (Stage 1): Households and invitations (Stage 4); other sign-in
providers; deleting an account (open, above).

*Stage 4, all proposed.*

### HSH-001 — Create a Household

**As** Joe, **I want** to create a Household, **so that** I can share with
the people I live with.
Priority: Must · Status: built (Settings → Households and a Household's page; plan step 8a)

Acceptance criteria
1. Given Settings → Households, when I create one and name it ("Home"),
   then I am its owner and only member.
2. Given I own a Household, then I can rename it.
3. Given Households, then I see each one I'm in, with its members and who
   owns it.

### HSH-002 — Invite someone

**As** a Household's owner, **I want** to invite someone by email, **so
that** they can join.
Priority: Must · Status: built (Settings → Households and a Household's page; plan step 8a)

Acceptance criteria
1. Given a Household I own, when I invite a Google email address, then the
   invitation is kept, and I'm told it was sent whether or not that address
   has an account.
2. Given an invitation for my address (whether I had an account or sign
   up later), then it waits in Settings → Households, and only there (not
   Inbox; Joe, 18 October), with the Household's name and who sent it;
   Join makes me a member, Decline removes it.
3. Given I'm a member, not the owner, then I can't invite anyone.
4. Given an invitation not yet answered, then the owner can withdraw it.

### HSH-003 — Several Households

**As** Joe, **I want** to be in more than one Household, **so that** I can
share different things with different people.
Priority: Should · Status: built (1 for Meals and Plan's cards; 2 for Meals, a shopping list's with Shopping, Stage 4b)

Acceptance criteria
1. Given I'm in two Households, then everything shared in each is shown to
   me, and each shared Item says which Household it belongs to.
2. Given a choice of Space for an Item (a Meal, a food shop), then it
   offers Personal and each of my Households.
3. Given an Item someone else made in a Household, then I can't move it to
   another Space; only its maker can (bug hunt, 21 October), and nobody
   can change who made it (multi-user bug hunt, 4 November).

### HSH-004 — Leaving and removing

**As** a member, **I want** to leave a Household, **so that** I stop
sharing; **as** the owner, I want to remove someone.
Priority: Must · Status: built (Settings → Households and a Household's page; plan step 8a)

Acceptance criteria
1. Given I'm a member, when I leave, then the shared Items I created become
   Personal to me, I stop seeing the rest
   ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md)),
   and I keep my Variations of others' Recipes
   ([ADR-0051](../../20-architecture/adr/0051-who-sees-food.md)). Links
   between my Items and the Household's go, so neither side still sees the
   other's through a link (Joe, 4 November); the Household's Events leave
   my Google Calendar (HSH-005 6).
2. Given I own a Household, when I remove a member, then it is as if they
   had left.
3. Given I own a Household, then I can't leave it, only delete it (Joe, 18
   October): after a warning naming its members, it is deleted for
   everyone, and each person's shared Items become Personal to whoever
   created them, as if all had left.
4. Given I rejoin a Household I left, then what I kept stays mine and
   separate: nothing is merged back.
5. Given I left or was removed, then no Reminder of mine about the
   Household's Items reaches me any more, and Done on a notification from
   before does nothing (multi-user bug hunt, 4 November).

### HSH-005 — Share Tasks and Events

**As** Joe, **I want** to share Tasks and Events with my Household, **so
that** we plan the chores and the days out together.
Priority: Must · Status: built (database tests `shared_tasks_test`, `shared_events_calendar_test`; walks `sharing.spec.ts`; two people on the real database checked by hand)

Acceptance criteria
1. Given a Household, then New task, New event and a Task's or Event's
   details end with **Space**: a Select of Personal and each of my
   Households. A new one starts Personal; only its maker changes it later,
   so it shows only on Items I made (HSH-003 3). Without a Household there
   is no Space field. A repeat's Space is the whole repeat's: moving one
   occurrence moves them all. An Item's Labels are its Space's: its popup
   offers that Space's Labels, and moving it takes the old Space's off.
2. Given a shared Task or Event, then every member sees it in Tasks, Inbox
   and on Plan, its Household's name in its meta, and can change it or
   delete it (with Undo, and from Recently deleted); a change one makes
   shows for all.
3. Given a shared Task, then nobody is assigned: it is in every member's
   Inbox (Today, Overdue) and counted in each one's morning digest
   ([REM-008](reminders.md#rem-008--a-morning-digest)) or overdue nudge;
   ticked by anyone, it is done for everyone, and a repeat's next
   occurrence follows as for my own.
4. Given a shared Task or Event with a date, then each member has their own
   default Reminder on it, as their own Settings give it (on or off, their
   default time;
   [REM-007](reminders.md#rem-007--reminder-defaults-in-settings)), and
   changes or removes only their own; anyone's other Reminders are theirs
   alone.
5. Given a shared Event, then it goes to each member's default Google
   calendar (none for a member without a two-way calendar or with None);
   see [GCL-007](integrations.md#gcl-007--a-shared-event-in-everyones-calendar).
6. Given someone joins, then they get their default Reminders on the
   Household's Tasks and Events still to come, and its Events go to their
   calendar; given someone leaves or is removed, its Events leave their
   calendar and their Reminders on its Items go (HSH-004).
7. Given a Personal Item of someone else's that I see only through a link
   to a shared Item, then it isn't in my Inbox or Tasks, and it opens
   read-only, saying whose it is; my own Personal Item linked to a shared
   one says "Visible to" the Household
   ([ADR-0016](../../20-architecture/adr/0016-sharing-and-visibility.md)).
8. Given an Event from a two-way Google calendar, then it can be shared
   too: it stays tied to my Google event, and goes to the others'
   calendars. One from an incoming-only calendar can't: it is Google's
   ([GCL-004](integrations.md#gcl-004--incoming-events-are-googles)).
