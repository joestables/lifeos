# Module specs

One file per Module, or per page where a Module has several, written at the start of its stage — not before.

| Module | Types | Stage |
|---|---|---|
| `shopping` | Shopping list: a food shop ([meals](meals.md#shopping), [ADR-0050](../../20-architecture/adr/0050-shopping-list.md), [ADR-0069](../../20-architecture/adr/0069-lists-and-recipes-tabs.md)) | 4b |
| `food` | Recipe, Variation, Meal; the Pantry ([recipes](recipes.md), [meals](meals.md)) | 4 |
| `fitness` | Exercise, Workout template, Workout ([gym](gym.md)) (5); Cardio activity (8) | 5, 8 |
| `goals` | Goal | 5 |
| `wardrobe` | Garment, Outfit, Outfit worn ([wardrobe](wardrobe.md)) | 6 |
| `health` | — (daily metrics, a time series) | Later |
| `finance` | Account | 9 |

The core's own Types (Thought, Note, Task, Event) are specified with Stage 2 and
Stage 3; its Reminder with Stage 7b, and its List with Stage 4b
([notes](../views/notes.md#nte-006--a-list)). The [data model](../../20-architecture/data-model.md) and the
[capability map](../capability-map.md) hold what is decided so far; open
points for particular specs are listed in the [roadmap](../../roadmap.md#open-questions).
