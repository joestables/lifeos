# Capability map

*Every capability → its owner and stage. Drawn from the decisions so far; the
specs that detail each one are written at the start of its stage. Items
marked "candidate" are candidate requirements for that spec, not designs.*

Owner: **core**, a **Module** (`lists`, `food`, `fitness`, `goals`,
`wardrobe`, `health`, `finance`) or an **Integration**. Page: the drawer page
(View) or Screen it lives on.

| Capability | Owner | Page / Screen | Stage | Spec |
|---|---|---|---|---|
| Sign up and sign in with Google; a Personal Space for everyone | core | — | 1 | [spaces-and-sharing](cross-cutting/spaces-and-sharing.md) |
| Design system: tokens and shared components | core | — | 1 | [design system](../30-design/README.md) |
| Navigation drawer | core | — | 1 | [ADR-0026](../20-architecture/adr/0026-navigation-drawer.md) |
| Quick capture (Thought by default, one-tap Task) | core | Capture Screen | 2 | [capture](cross-cutting/capture.md) |
| Capture address; Siri, email, Android share | core | Settings (token) | 2 | [capture](cross-cutting/capture.md) |
| Notes: Labels as headings, pin, simple formatting | core | Notes | 2 | [notes](views/notes.md) |
| Tasks: Labels, do-on and due, steps checklist, Someday, repeating | core | Tasks | 2 | [tasks](views/tasks.md) |
| Inbox, including sorting Thoughts into other Types | core | Inbox | 2 | [inbox](views/inbox.md) |
| Reminders by Web Push; Done/Snooze actions, overdue nudges, morning digest | core | — | 2 | [reminders](cross-cutting/reminders.md) |
| An Item's details; delete and recover; convert; Labels | core | Item Sheet, Settings | 2 | [items](cross-cutting/items.md) |
| Starred and Recent | core | Search Screen, Tasks | 2 | [items](cross-cutting/items.md) |
| Search (full-text) | core | Search Screen | 2 | [search](cross-cutting/search.md) |
| Offline writes (data layer and write queue) | core | — | 1 | [offline](cross-cutting/offline.md) |
| Activity log: changes to items and links | core | — | 1 | [ADR-0030](../20-architecture/adr/0030-activity-log-by-triggers.md) |
| Plan | core | Plan | 3 | [plan](views/plan.md) |
| Events, repeating Events | core | Plan | 3 | — |
| Google Calendar | Integration | — | 3 | [integrations](cross-cutting/integrations.md) |
| Lists, Shops, list templates, live updates | `lists` | Notes (Lists) | 3 | — |
| Recipes, Variations, ideas, cook log | `food` | Recipes | 4 | — |
| Meal planning; ingredients to shopping lists | `food`, `lists` | Plan | 4 | — |
| Shared AI service; food preferences | core | — | 4 | — |
| Contacts and Households: connect by Google email, invite, accept; sharing on | core | — | 4 | [spaces-and-sharing](cross-cutting/spaces-and-sharing.md) |
| Gym, with v1's recovery model and snapshots | `fitness` | Gym | 5 | — |
| Goals and the measures registry | `goals` | Goals | 5 | — |
| Wardrobe and outfits | `wardrobe` | Wardrobe | 6 | — |
| Exact-alarm Reminders (Android wrapper) | core | — | 7 | [reminders](cross-cutting/reminders.md) |
| Health Connect | Integration | — | 7–8 | [integrations](cross-cutting/integrations.md) |
| Cardio, with Oura and Health Connect | `fitness`, Integration | Cardio | 8 | — |
| Finance | `finance` | Finance | 9 | — |
| Export of everything you can see, as JSON | core | — | — | — |
| LifeOS MCP server | core | — | Later | — |
| Settings: notifications, Reminder defaults, default time, digest time, capture address, Labels, recovering deleted Items (Stage 2); reference data (with its Module) | core | Settings Screen | 2 | [reminders](cross-cutting/reminders.md), [capture](cross-cutting/capture.md), [items](cross-cutting/items.md) |
