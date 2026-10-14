# Roadmap

*Provisionally agreed. Specs are written just in time: each stage from 1 on
starts by writing the specs it needs, and no earlier.*

## Stages

| # | Stage | Outcome |
|---|---|---|
| 0 | Requirements and architecture | Agreed decisions (ADRs), data model and architecture — enough to start Stage 1 |
| 1 | **Starts with its specs:** sign-in and Spaces, offline writes. Then foundation: pause v1; **new Supabase project** (London); repo; core schema and Spaces; auth; navigation drawer; **the design system** (shadcn themed with LifeOS tokens, and the shared components the first screens need); data layer and write queue; the activity log (items and links); **the ontology package** (constants and the lookup migration); **CI with database tests**; the `can_read` benchmark; `ops.events` and the nightly health check | A solid base, built only as far as Stage 2 needs |
| 2 | **Starts with its specs:** capture, Thoughts and Inbox, Notes, Tasks (with repeats), Reminders. Then: the colours by Type and the app icon, designed with Joe; capture in the app (Thought by default); sorting Thoughts in Inbox; Notes with Labels and pins; Tasks with Labels, stars, sub-tasks and **repeating Tasks**; Inbox; Reminders by Web Push with Done/Snooze actions (Android and desktop), overdue nudges and the morning digest; Search; Playwright walks in CI (the nightly smoke walk deferred until the roadmap is complete). Until Stage 3, an event-shaped line is saved as a Thought or a Task. | **Replaces Google Tasks — start using it daily** |
| 3 | **Starts with its specs:** Plan, Events, Google Calendar. Then: Plan, every Schedulable Type in a week (computer) or a day (phone), filtered by Type; Events (and repeating Events, with Labels), with the Task ↔ Event switch; Google Calendar, incoming only or two-way, always Personal | The one planning view |
| 4 | Recipes, Variations and ideas, cook log, meal planning; the shared AI service and food preferences; Contacts and Households, with sharing on | Shared with girlfriend |
| 4b | Lists, Shops and list templates, with live updates; ingredients to shopping lists | Shopping together |
| 5 | Gym (with v1's recovery model and snapshots), then Goals and the measures registry | The joined-up payoff |
| 6 | Wardrobe and outfits | |
| 7 | Android wrapper: exact-alarm Reminders, then Health Connect | Phone alarms can go |
| 8 | Cardio with Oura and Health Connect | |
| 9 | Finance | |
| 10 | Capture from outside the app: the capture address, iOS Shortcuts and Siri, email, Android's home-screen shortcut and share target, an Android widget for typing a Thought ([ADR-0028](20-architecture/adr/0028-capture-from-outside-the-app.md)) | Capture without opening LifeOS |

Between pausing v1 (Stage 1) and Stages 4–6, Recipes, Gym and Wardrobe are
unavailable. Agreed: v1 is being wiped
([ADR-0002](20-architecture/adr/0002-start-afresh-port-selectively.md)).

## Where we are

Each stage's working plan, and a record of every pull request, live in
[50-progress](50-progress/). Stages 0, 1 and 2 are done
([Stage 2's plan](50-progress/plans/stage-2.md); its nightly smoke walk is
deferred until the roadmap is complete). **Stage 3 has started**: its
[plan](50-progress/plans/stage-3.md) is written, and its first step is the
specs, for Joe to agree. Lists, Shops and list templates moved from Stage 3
to Stage 4b, after Recipes (Joe, 14 October).

Each stage begins by writing its own plan (`50-progress/plans/stage-N.md`,
shaped like the last one) whose first step is the stage's specs, which Joe
agrees before anything is built.

## Open questions

| Question | Settled in |
|---|---|
| Leaving the Household: does "created by" decide ownership, or does the leaver take a copy? ([ADR-0016](20-architecture/adr/0016-sharing-and-visibility.md)) | To confirm |
| The inbound-email service for the capture address: Cloudflare Email Routing or Postmark ([integration setup](40-operations/integration-setup.md#capture-address-email-after-stage-9)) | Stage 10 |
| On a repeating Shop, do unticked lines carry over to the next occurrence? | Lists spec (Stage 4b) |
| Unit conversion (100 g + 1 cup); whether a pantry is wanted | Recipes spec (Stage 4) |
| Which v1 AI features return (Explore, Labs, dish images, recipe import) | Stage 4 |
| A Project Type, if grouping Tasks needs more than Labels | When needed |
| How Contact search avoids revealing who has an account; whether a Contact can be removed ([ADR-0039](20-architecture/adr/0039-accounts-contacts-households.md)) | Before Stage 4 |

## Re-checks

| What | When |
|---|---|
| shadcn's default (Base UI or Radix) for new projects | Before starting |
| iOS Web Push notification buttons | Done 10 October 2026: still none ([reminders](10-requirements/cross-cutting/reminders.md#decisions)) |
| Whether Gemini offers a route to the capture address | Done 10 October 2026: none ([capture](10-requirements/cross-cutting/capture.md#where-capture-comes-from)); again before Stage 10 |
| Oura API access | Before Stage 8 |
| Open Banking aggregators' personal-use availability | Before Stage 9 |

## Later opportunities

Each is a later stage's decision; listed so nothing closes the door on them.

- **Readiness-aware gym planning** — v1's muscle recovery model plus Oura's
  readiness: "you're recovered for push, not legs", offered as a suggestion
  on Plan and in Inbox.
- **Weather** — an Integration that feeds outfit suggestions ("12°C, dry")
  and run planning.
- **Nutrition** — the Ingredient catalogue can carry nutrition data later
  (e.g. Open Food Facts), so meals have macros and a goal like "140 g protein
  a day" becomes measurable.
- **Plan my week** — v1's "help me decide what to eat", widened: an AI that
  plans dinners around gym days, Saturday's shop, events out and recipes not
  cooked lately, within food preferences.
- **A LifeOS MCP server** on the published layer.
- **Location Reminders** and a **Place** Type ("near Tesco").
