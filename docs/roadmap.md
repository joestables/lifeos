# Roadmap

*Provisionally agreed. Specs are written just in time: each stage from 1 on
starts by writing the specs it needs, and no earlier.*

## Stages

| # | Stage | Outcome |
|---|---|---|
| 0 | Requirements and architecture | Agreed decisions (ADRs), data model and architecture — enough to start Stage 1 |
| 1 | **Starts with its specs:** sign-in and Spaces, offline writes. Then foundation: pause v1; **new Supabase project** (London); repo; core schema and Spaces; auth; navigation drawer; **the design system** (shadcn themed with LifeOS tokens, and the shared components the first screens need); data layer and write queue; the activity log (items and links); **the ontology package** (constants and the lookup migration); **CI with database tests**; the `can_read` benchmark; `ops.events` and the nightly health check; nightly backup | A solid base, built only as far as Stage 2 needs |
| 2 | **Starts with its specs:** capture, Thoughts and Inbox, Notes, Tasks (with repeats), Reminders. Then: capture (Thought by default) and **the capture address**; sorting Thoughts in Inbox; Notes with Labels; Tasks with Labels and **repeating Tasks**; Inbox; Reminders by Web Push with Done/Snooze actions (Android and desktop), overdue nudges and the morning digest; Starred and Recent; Playwright walks in CI, then the nightly smoke walk. Until Stage 3, an event-shaped line is saved as a Thought or a Task. | **Replaces Google Tasks — start using it daily** |
| 3 | Plan, Events (and repeating Events), Google Calendar; then Lists, Shops and list templates, with live updates | The one planning view |
| 4 | Recipes, Variations and ideas, cook log, meal planning, ingredients to shopping lists; the shared AI service and food preferences; Contacts and Households, with sharing on | Shared with girlfriend |
| 5 | Gym (with v1's recovery model and snapshots), then Goals and the measures registry | The joined-up payoff |
| 6 | Wardrobe and outfits | |
| 7 | Android wrapper: exact-alarm Reminders, then Health Connect | Phone alarms can go |
| 8 | Cardio with Oura and Health Connect | |
| 9 | Finance | |

Between pausing v1 (Stage 1) and Stages 4–6, Recipes, Gym and Wardrobe are
unavailable. Agreed: v1 is being wiped
([ADR-0002](20-architecture/adr/0002-start-afresh-port-selectively.md)).

## Where we are

Each stage's working plan, and a record of every pull request, live in
[50-progress](50-progress/). The current plan:
[Stage 0](50-progress/plans/stage-0.md).

Each stage begins by writing its own specs.

## Open questions

| Question | Settled in |
|---|---|
| Leaving the Household: does "created by" decide ownership, or does the leaver take a copy? ([ADR-0016](20-architecture/adr/0016-sharing-and-visibility.md)) | To confirm |
| The inbound-email service for the capture address | Stage 2 |
| On a repeating Shop, do unticked lines carry over to the next occurrence? | Lists spec (Stage 3) |
| Unit conversion (100 g + 1 cup); whether a pantry is wanted | Recipes spec (Stage 4) |
| Which v1 AI features return (Explore, Labs, dish images, recipe import) | Stage 4 |
| A Project Type, if grouping Tasks needs more than Labels | When needed |
| How Contact search avoids revealing who has an account; whether a Contact can be removed ([ADR-0039](20-architecture/adr/0039-accounts-contacts-households.md)) | Before Stage 4 |

## Re-checks

| What | When |
|---|---|
| shadcn's default (Base UI or Radix) for new projects | Before starting |
| iOS Web Push notification buttons | Before Stage 2 |
| Whether Gemini offers a route to the capture address | Before Stage 2 |
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
