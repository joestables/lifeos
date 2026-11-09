import type { Colour, Mark, ModuleKey, SpaceKind, Status, TimeField, Trait } from './traits.ts'

export interface TypeDefinition {
  /** Stored in core.items.type. Never renamed without an ADR (ADR-0036). */
  key: string
  module: ModuleKey
  /** The name people see. */
  label: string
  traits: readonly Trait[]
  /** The statuses this Type uses, in order, with any Type-specific labels. */
  statuses: readonly Status[]
  statusLabels?: Partial<Record<Status, string>>
  defaultSpace: SpaceKind
  /** The time fields this Type may set; the database refuses the others. */
  timeFields: readonly TimeField[]
  colour: Colour
  /** Whether the Type uses Labels (ADR-0014): Thoughts, Notes, Tasks and Events. */
  labels: boolean
  /** Its per-person mark, if it has one. */
  mark?: Mark
  /** Whether it holds sub-tasks: lines you tick inside it. */
  subtasks: boolean
  /** Whether it has a place (an Event's "The Ivy, Richmond"). */
  place: boolean
  /** Whether it takes Alerts (ADR-0065 5); the database refuses an Alert on any other. */
  alerts: boolean
  /** The time field its default Alert follows (ADR-0023), if it has one. */
  defaultAlert?: TimeField
  /** The roadmap stage that builds it: the app offers a Type only from then. 4.5 is Stage 4b, 7.5 Stage 7b. */
  stage: number
  /** For the data model's generated table: a few words after its name. */
  about?: string
  /** For the generated table: its Space, when "Personal" or "Household" isn't the whole story. */
  spaceNote?: string
  /** For the generated table: what its statuses leave unsaid. */
  statusNote?: string
}

/** The Types built so far (data-model.md#types). Later Types arrive with their stage. */
export const TYPES = [
  {
    key: 'thought',
    module: 'core',
    label: 'Thought',
    about: 'raw, unsorted; waits in Inbox until sorted or ticked off',
    traits: ['completable'],
    statuses: ['active', 'done'],
    defaultSpace: 'personal',
    timeFields: [],
    colour: 'yellow',
    labels: true,
    subtasks: false,
    place: false,
    alerts: true,
    stage: 2,
  },
  {
    key: 'note',
    module: 'core',
    label: 'Note',
    traits: ['capturable'],
    statuses: ['active'],
    defaultSpace: 'personal',
    timeFields: [],
    colour: 'yellow',
    labels: true,
    mark: 'pinned',
    subtasks: false,
    place: false,
    alerts: false,
    stage: 2,
  },
  {
    key: 'task',
    module: 'core',
    label: 'Task',
    traits: ['schedulable', 'completable', 'shareable', 'capturable'],
    statuses: ['idea', 'active', 'done', 'cancelled'],
    statusLabels: { idea: 'Someday' },
    statusNote: 'a missed repeat: "Skipped"',
    spaceNote: 'Personal, or a Household chosen in its popup (HSH-005)',
    defaultSpace: 'personal',
    timeFields: ['do_on', 'do_at', 'due_on'],
    colour: 'blue',
    labels: true,
    mark: 'starred',
    subtasks: true,
    place: false,
    alerts: true,
    defaultAlert: 'do_on',
    stage: 2,
  },
  {
    key: 'event',
    module: 'core',
    label: 'Event',
    about: 'a place; not captured, but a Thought can become one',
    spaceNote: 'Personal, or a Household chosen in its popup, from Google Calendar too (HSH-005)',
    traits: ['schedulable', 'shareable', 'capturable'],
    statuses: ['active', 'cancelled'],
    defaultSpace: 'personal',
    timeFields: ['starts_at', 'ends_at', 'all_day'],
    colour: 'blue',
    labels: true,
    subtasks: false,
    place: true,
    alerts: true,
    // 30 minutes before a timed Event I make; none when all day or from Google (EVT-003).
    defaultAlert: 'starts_at',
    stage: 3,
  },
  {
    // A nudge: a title, its Alerts and a Repeat; never done (ADR-0065 1). Its
    // day is its first Alert's, each Alert on it relative to that day.
    key: 'reminder',
    module: 'core',
    label: 'Reminder',
    about: 'a title, its Alerts and a Repeat; never done',
    traits: ['schedulable', 'capturable'],
    statuses: ['active'],
    defaultSpace: 'personal',
    timeFields: ['do_on'],
    colour: 'blue',
    labels: false,
    subtasks: false,
    place: false,
    alerts: true,
    stage: 7.5,
  },
  {
    // The dish: its heading. Its status is worked out from its Variations'
    // (the highest: Complete over Draft over Idea), never set, except that
    // archiving it archives them all (ADR-0011).
    key: 'recipe',
    module: 'food',
    label: 'Recipe',
    about: 'the dish',
    spaceNote:
      "Its author's Personal, seen read-only by their Households ([ADR-0051](adr/0051-who-sees-food.md))",
    statusNote: "the highest of its Variations', worked out",
    traits: ['shareable', 'capturable'],
    statuses: ['idea', 'active', 'done', 'cancelled'],
    statusLabels: { idea: 'Idea', active: 'Draft', done: 'Complete', cancelled: 'Archived' },
    // Its author's Personal Space, seen read-only by their Households (ADR-0051).
    defaultSpace: 'personal',
    timeFields: [],
    colour: 'green',
    labels: false,
    mark: 'favourited',
    subtasks: false,
    place: false,
    alerts: false,
    stage: 4,
  },
  {
    // A way of making a Recipe: its own author's, the Recipe's or a
    // Household member's (ADR-0051). Its status is set by hand.
    key: 'variation',
    module: 'food',
    label: 'Variation',
    about: 'a way of making it',
    spaceNote: "Its own author's: the Recipe's, or a Household member's added to it (ADR-0051)",
    statusNote: 'set by hand; never back to Idea once it has ingredients or a method',
    traits: ['shareable'],
    statuses: ['idea', 'active', 'done', 'cancelled'],
    statusLabels: { idea: 'Idea', active: 'Draft', done: 'Complete', cancelled: 'Archived' },
    defaultSpace: 'personal',
    timeFields: [],
    colour: 'green',
    labels: false,
    subtasks: false,
    place: false,
    alerts: false,
    stage: 4,
  },
  {
    // A Meal from a Recipe's Variation, typed, or leftovers of another.
    // Ticked "eaten", it logs no cook.
    key: 'meal',
    module: 'food',
    label: 'Meal',
    about: 'from a Variation, typed, or leftovers of another',
    spaceNote: 'Household when in one, else Personal',
    statusNote: 'ticking it eaten logs no cook',
    traits: ['schedulable', 'completable', 'shareable'],
    statuses: ['active', 'done', 'cancelled'],
    statusLabels: { active: 'Planned', done: 'Eaten' },
    defaultSpace: 'household',
    timeFields: ['do_on', 'slot'],
    colour: 'green',
    labels: false,
    subtasks: false,
    place: false,
    alerts: true,
    stage: 4,
  },
  {
    // A food shop or a list (ADR-0050): a date and nothing more (no time or
    // place); on Plan when dated, and done when the shop is.
    key: 'shopping_list',
    module: 'shopping',
    label: 'Shopping list',
    about: 'a food shop or a list; a date is optional',
    spaceNote: 'Household when in one, else Personal; a food shop the Space chosen for it',
    traits: ['schedulable', 'completable', 'shareable', 'capturable'],
    statuses: ['active', 'done', 'cancelled'],
    defaultSpace: 'household',
    timeFields: ['do_on'],
    colour: 'yellow',
    labels: false,
    subtasks: false,
    place: false,
    alerts: true,
    stage: 4.5,
  },
  {
    // An exercise in my library (ADR-0058): its equipment, muscle groups and
    // current set in fitness.exercise. Archived, not deleted, once used.
    key: 'exercise',
    module: 'fitness',
    label: 'Exercise',
    statusNote: 'archived when I no longer do it',
    traits: [],
    statuses: ['active', 'cancelled'],
    statusLabels: { cancelled: 'Archived' },
    defaultSpace: 'personal',
    timeFields: [],
    colour: 'coral',
    labels: false,
    subtasks: false,
    place: false,
    alerts: false,
    stage: 5,
  },
  {
    // A name and its exercises, each with a number of sets (ADR-0058).
    key: 'workout_template',
    module: 'fitness',
    label: 'Workout template',
    traits: [],
    statuses: ['active'],
    defaultSpace: 'personal',
    timeFields: [],
    colour: 'coral',
    labels: false,
    subtasks: false,
    place: false,
    alerts: false,
    stage: 5,
  },
  {
    // A workout planned for a day (ADR-0058): planned, in progress or
    // complete in fitness.workout; Skipped is worked out, never stored.
    key: 'workout',
    module: 'fitness',
    label: 'Workout',
    statusNote:
      '"In progress" is its stage; "Skipped" when planned and its day has passed, worked out',
    traits: ['schedulable', 'completable'],
    statuses: ['active', 'done'],
    statusLabels: { active: 'Planned', done: 'Complete' },
    defaultSpace: 'personal',
    timeFields: ['do_on'],
    colour: 'coral',
    labels: false,
    subtasks: false,
    place: false,
    alerts: false,
    stage: 5,
  },
] as const satisfies readonly TypeDefinition[]

export type TypeKey = (typeof TYPES)[number]['key']

export function typeByKey(key: string): TypeDefinition | undefined {
  return TYPES.find((t) => t.key === key)
}

export function hasTrait(type: TypeDefinition, trait: Trait): boolean {
  return type.traits.includes(trait)
}
