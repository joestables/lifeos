# Capability map

*Every capability → its owner and stage. Drawn from the decisions so far; the
specs that detail each one are written at the start of its stage. Items
marked "candidate" are candidate requirements for that spec, not designs.*

Owner: **core**, a **Module** (`lists`, `food`, `fitness`, `goals`,
`wardrobe`, `health`, `finance`) or an **Integration**. Page: the drawer page
(View) or Screen it lives on.

| Capability | Owner | Page / Screen | Stage | Spec |
|---|---|---|---|---|
| Sign-in; Spaces; invitation creates the account | core | — | 1 (Household on in 4) | [spaces-and-sharing](cross-cutting/spaces-and-sharing.md) |
| Navigation drawer | core | — | 1 | [ADR-0026](../20-architecture/adr/0026-navigation-drawer.md) |
| Quick capture (Note by default, one-tap Task) | core | Capture Screen | 2 | [capture](cross-cutting/capture.md) |
| Capture address | core | Settings (token) | 2 | [capture](cross-cutting/capture.md) |
| Notes: Labels as headings, pin, colour, simple formatting (candidate) | core | Notes | 2 | — |
| Tasks: Labels, do-on and due, steps checklist, repeating | core | Tasks | 2 | — |
| Inbox | core | Inbox | 2 | [inbox](views/inbox.md) |
| Reminders by Web Push; Done/Snooze actions, overdue nudges, morning digest (candidate) | core | — | 2 | [reminders](cross-cutting/reminders.md) |
| Starred and Recent (candidate) | core | — | 2 | — |
| Search (full-text) | core | Search Screen | 2 | [search](cross-cutting/search.md) |
| Offline writes (data layer and write queue) | core | — | 1 | [offline](cross-cutting/offline.md) |
| Plan | core | Plan | 3 | [plan](views/plan.md) |
| Events, repeating Events | core | Plan | 3 | — |
| Google Calendar | Integration | — | 3 | [integrations](cross-cutting/integrations.md) |
| Lists, Shops, list templates, live updates | `lists` | Notes (Lists) | 3 | — |
| Recipes, Variations, ideas, cook log | `food` | Recipes | 4 | — |
| Meal planning; ingredients to shopping lists | `food`, `lists` | Plan | 4 | — |
| Shared AI service; food preferences | core | — | 4 | — |
| Household sharing on | core | — | 4 | [spaces-and-sharing](cross-cutting/spaces-and-sharing.md) |
| Gym, with v1's recovery model and snapshots | `fitness` | Gym | 5 | — |
| Goals and the measures registry | `goals` | Goals | 5 | — |
| Wardrobe and outfits | `wardrobe` | Wardrobe | 6 | — |
| Exact-alarm Reminders (Android wrapper) | core | — | 7 | [reminders](cross-cutting/reminders.md) |
| Health Connect | Integration | — | 7–8 | [integrations](cross-cutting/integrations.md) |
| Cardio, with Oura and Health Connect | `fitness`, Integration | Cardio | 8 | — |
| Finance | `finance` | Finance | 9 | — |
| Export of everything you can see, as JSON | core | — | — | — |
| LifeOS MCP server | core | — | Later | — |
| Settings: Reminder defaults, default time, digest time, reference data, capture token | core | Settings Screen | — | — |
