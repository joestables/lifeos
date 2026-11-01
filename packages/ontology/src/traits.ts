/** A capability a Type has (glossary: Trait). */
export const TRAITS = ['schedulable', 'completable', 'shareable', 'capturable'] as const
export type Trait = (typeof TRAITS)[number]

/** Where an Item is in its life (glossary: Status). Each Type uses a subset. */
export const STATUSES = ['idea', 'active', 'done', 'cancelled'] as const
export type Status = (typeof STATUSES)[number]

/** Who can see an Item (glossary: Space). */
export const SPACE_KINDS = ['personal', 'household'] as const
export type SpaceKind = (typeof SPACE_KINDS)[number]

/** The time fields on core.items (data-model.md#time-fields-per-schedulable-type). */
export const TIME_FIELDS = [
  'starts_at',
  'ends_at',
  'all_day',
  'do_on',
  'do_at',
  'due_on',
  'slot',
] as const
export type TimeField = (typeof TIME_FIELDS)[number]

/** Code packaging (glossary: Module). The core, then food (Stage 4), shopping (4b) and fitness (5). */
export const MODULES = ['core', 'food', 'shopping', 'fitness'] as const
export type ModuleKey = (typeof MODULES)[number]

/** Each Type's colour; related Types share one (ADR-0043, tokens.md#colour-types). */
export const COLOURS = ['blue', 'yellow', 'coral', 'green', 'orange', 'purple'] as const
export type Colour = (typeof COLOURS)[number]

/** The per-person flag a Type may have, under its own name (glossary: Mark). */
export const MARKS = ['pinned', 'starred', 'favourited'] as const
export type Mark = (typeof MARKS)[number]
