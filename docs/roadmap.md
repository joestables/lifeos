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
| 4 | **Starts with its specs:** Recipes, the Meal plan and the Pantry, Shopping. Then: the **Recipes** page (the recipe library and saved ideas, Variations, cook log, ideas shared from other apps on Android) and the **Meal plan** page (planning Meals, and the Pantry of ingredients and household items); Households (invited by email; owner and members; several per person), with sharing on; the shared AI service (importing a recipe, filling ingredients from a method, a Meal's ingredients from a link) and food preferences | Shared with girlfriend |
| 4b | **Shopping:** Food and Lists tabs (Online later). Food shops linked to Meals and following their ingredients, with more added from the Pantry or typed, each Household's Essentials and out of stock offered; other shopping lists; live updates. One Shopping list Type replaces List and Shop ([ADR-0050](20-architecture/adr/0050-shopping-list.md)). Saving a recipe idea shared from another app, left from Stage 4 | Shopping together |
| 5 | Gym (with its recovery engine and snapshots), then Goals and the measures registry | The joined-up payoff |
| 6 | Wardrobe and outfits | |
| 7 | Android wrapper: exact-alarm Reminders, then Health Connect | Phone alarms can go |
| 8 | Cardio with Oura and Health Connect | |
| 9 | Finance | |
| 10 | Capture from outside the app: the capture address, iOS Shortcuts and Siri, email, Android's home-screen shortcut and share target (for recipe ideas, already in Stage 4b, as is an iOS Shortcut for them), an Android widget for typing a Thought ([ADR-0028](20-architecture/adr/0028-capture-from-outside-the-app.md)) | Capture without opening LifeOS |

Between pausing v1 (Stage 1) and Stages 4–6, Recipes, Gym and Wardrobe are
unavailable. Agreed: v1 is being wiped
([ADR-0002](20-architecture/adr/0002-start-afresh-port-selectively.md)).

## Where we are

Each stage's working plan, and a record of every pull request, live in
[50-progress](50-progress/). Stages 0, 1 and 2 are done
([Stage 2's plan](50-progress/plans/stage-2.md); its nightly smoke walk is
deferred until the roadmap is complete). Stage 3 is done (Joe, 17 October;
[its plan](50-progress/plans/stage-3.md)): Plan, Events and Google
Calendar, incoming and two-way. Stage 4 is done (Joe, 24 October;
[its plan](50-progress/plans/stage-4.md)): Recipes, the Meal plan and the
Pantry, Households, and import with the AI. **Stage 4b (Shopping) has
started**: [its plan](50-progress/plans/stage-4b.md) is written, and its
specs, drafted with Stage 4's, come first. **Stage 5 (Gym) has
started** alongside it: [its plan](50-progress/plans/stage-5.md) is
written, its spec (29 October) and design (1 November) agreed by Joe, and
its schema in the database, its calculations in `packages/fitness`, and
its settings and exercise library built (1 November). Lists and Shops moved from Stage 3 to Stage 4b, after Recipes (Joe,
14 October); on 17 October Joe set out Recipes, Meal plan and Shopping as
three pages, with one Shopping list Type taking the place of List and Shop
([ADR-0050](20-architecture/adr/0050-shopping-list.md)), and moved Cardio
into the drawer as a blank page.

Each stage begins by writing its own plan (`50-progress/plans/stage-N.md`,
shaped like the last one) whose first step is the stage's specs, which Joe
agrees before anything is built.

## Open questions

| Question | Settled in |
|---|---|
| Leaving the Household: does "created by" decide ownership, or does the leaver take a copy? ([ADR-0016](20-architecture/adr/0016-sharing-and-visibility.md)) | To confirm |
| The inbound-email service for the capture address: Cloudflare Email Routing or Postmark ([integration setup](40-operations/integration-setup.md#capture-address-email-after-stage-9)) | Stage 10 |
| The open points in [recipes](10-requirements/modules/recipes.md#open-points-for-joe) and [meals](10-requirements/modules/meals.md#open-points-for-joe) | Stage 4 specs |
| A Project Type, if grouping Tasks needs more than Labels | When needed |
| Stage 3's as-built choices: Google Calendar's ([ADR-0047](20-architecture/adr/0047-google-calendar-sync.md#as-built-16-october-plan-step-9)); two-way, where the later change wins for the whole event rather than field by field ([ADR-0048](20-architecture/adr/0048-google-calendar-two-way.md#as-built-16-october-plan-step-10)); Plan placing Items from what the device holds ([ADR-0049](20-architecture/adr/0049-plans-read.md)) | To confirm |

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

- **Readiness-aware gym planning** — the Gym's recovery engine plus Oura's
  readiness: "you're recovered for push, not legs", offered as a suggestion
  on Plan and in Inbox.
- **Weather** — an Integration that feeds outfit suggestions ("12°C, dry")
  and run planning.
- **Nutrition** — the Pantry can carry nutrition data later
  (e.g. Open Food Facts), so meals have macros and a goal like "140 g protein
  a day" becomes measurable.
- **Online shopping** — Shopping's Online tab (Joe, 24 October): items I
  want to buy online, watched for price drops, with a notification when one
  falls ([Stage 4b plan](50-progress/plans/stage-4b.md#joes-answers-24-october)).
- **Plan my week** — v1's "help me decide what to eat", widened: an AI that
  plans dinners around gym days, Saturday's shop, events out and recipes not
  cooked lately, within food preferences.
- **A LifeOS MCP server** on the published layer.
- **Location Reminders** and a **Place** Type ("near Tesco").
