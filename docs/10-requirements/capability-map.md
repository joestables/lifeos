# Capability map

*Every capability → its owner and stage. Drawn from the decisions so far; the
specs that detail each one are written at the start of its stage. Items
marked "candidate" are candidate requirements for that spec, not designs.*

Owner: **core**, a **Module** (`shopping`, `food`, `fitness`, `goals`,
`wardrobe`, `health`, `finance`) or an **Integration**. Page: the drawer page
(View) or Screen it lives on.

| Capability | Owner | Page / Screen | Stage | Spec |
|---|---|---|---|---|
| Sign up and sign in with Google; a Personal Space for everyone | core | — | 1 | [spaces-and-sharing](cross-cutting/spaces-and-sharing.md) |
| Design system: tokens and shared components | core | — | 1 | [design system](../30-design/README.md) |
| Navigation drawer | core | — | 1 | [ADR-0026](../20-architecture/adr/0026-navigation-drawer.md) |
| Quick capture in the app (Thought by default, one-tap Task) | core | Capture Screen | 2 | [capture](cross-cutting/capture.md) |
| Notes: Labels to filter, pin, simple formatting | core | Notes | 2 | [notes](views/notes.md) |
| Tasks: Labels, do-on and due, star, sub-tasks, Someday, repeating | core | Tasks | 2 | [tasks](views/tasks.md) |
| Inbox, including sorting Thoughts into other Types | core | Inbox | 2 | [inbox](views/inbox.md) |
| Reminders by Web Push; Done/Snooze actions, overdue nudges, morning digest | core | — | 2 | [reminders](cross-cutting/reminders.md) |
| Opening an Item; delete and recover; convert; Labels on Thoughts, Notes and Tasks (Events from Stage 3) | core | Each page; Settings | 2 | [items](cross-cutting/items.md) |
| Colour by Type; the app icon | core | — | 2 | [ADR-0043](../20-architecture/adr/0043-colour-by-type.md), [design system](../30-design/README.md) |
| Search (full-text) | core | Search Screen | 2 | [search](cross-cutting/search.md) |
| Offline writes (data layer and write queue) | core | — | 1 | [offline](cross-cutting/offline.md) |
| Activity log: changes to items and links | core | — | 1 | [ADR-0030](../20-architecture/adr/0030-activity-log-by-triggers.md) |
| Plan: every Schedulable Type, a week or a day, filtered by Type | core | Plan | 3 | [plan](views/plan.md) |
| Events, repeating Events, Tasks for an Event | core | Plan | 3 | [events](cross-cutting/events.md) |
| Google Calendar: incoming only or two-way per calendar, always Personal | Integration | Settings | 3 | [integrations](cross-cutting/integrations.md#google-calendar) |
| Recipes, Variations, ideas, cook log | `food` | Recipes | 4 | [recipes](modules/recipes.md) |
| Meal planning; the Pantry | `food` | Meal plan (Meals on Plan too) | 4 | [meals](modules/meals.md) |
| Shared AI service; food preferences | core | — | 4 | — |
| Households: create, invite by email, accept, owner and members, several per person; sharing on | core | Settings | 4 | [spaces-and-sharing](cross-cutting/spaces-and-sharing.md) |
| Shopping lists: food shops and other lists, Essentials, live updates | `shopping` | Shopping | 4b | [meals](modules/meals.md#shopping) |
| Ingredients to shopping lists | `food`, `shopping` | Meal plan, Shopping | 4b | [meals](modules/meals.md#shopping) |
| Online: items watched for price drops, with alerts | `shopping` | Shopping | Later | [roadmap](../roadmap.md#later-opportunities) |
| Gym, with v1's recovery model and snapshots | `fitness` | Gym | 5 | — |
| Goals and the measures registry | `goals` | Goals | 5 | — |
| Wardrobe and outfits | `wardrobe` | Wardrobe | 6 | — |
| Exact-alarm Reminders (Android wrapper) | core | — | 7 | [reminders](cross-cutting/reminders.md) |
| Health Connect | Integration | — | 7–8 | [integrations](cross-cutting/integrations.md) |
| Cardio, with Oura and Health Connect (a blank page in the drawer until then) | `fitness`, Integration | Cardio | 8 | — |
| Finance | `finance` | Finance | 9 | — |
| Capture from outside the app: capture address, Siri, email, Android shortcut, share and widget | core | Settings (address) | 10 | [capture](cross-cutting/capture.md#deferred-to-stage-10) |
| Export of everything you can see, as JSON | core | — | — | — |
| LifeOS MCP server | core | — | Later | — |
| Settings: notifications and devices, Reminder defaults, default time, digest time, Labels, Recently deleted (Stage 2); reference data (with its Module); the capture address (Stage 10) | core | Settings Screen | 2 | [reminders](cross-cutting/reminders.md), [items](cross-cutting/items.md) |
